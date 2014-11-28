var async = require('async');
var mongoose = require('mongoose');
var Draws = mongoose.model('Draw');
var Numbers = mongoose.model('Number');
var Statics = mongoose.model('Static');


module.exports = {

    drawDateFrom : 20010421,

    queryConf : {
        draw: "drawid drawdate main supple",
        static: "-_id main supple last20Stat",
        number: "num main supple"
    },

    buildStatics: function(arr){

        var result = {
            sum: 0,
            avg: 0,
            group: {
                low: [],
                lowMed: [],
                med: [],
                highMed: [],
                high: []
            },
            parity: {
                even: [],
                odd: []
            }
        }

        arr.map(function(item){
            result.sum += Number(item);

            if ((item % 2) !== 0) {
                result.parity.odd.push(item);
            } else {
                result.parity.even.push(item);
            }

            if (item < 10) {
                result.group.low.push(item);
            }
            if (item >= 10 && item < 20) {
                result.group.lowMed.push(item);
            }
            if (item >= 20 && item < 30) {
                result.group.med.push(item);
            }
            if (item >= 30 && item < 40) {
                result.group.highMed.push(item);
            }
            if (item >= 40) {
                result.group.high.push(item);
            }
        });

        result.avg = Math.round(result.sum/arr.length);

        return result;
    },


    initNumbers: function(){

        //create the initial data for draw number
        var fullNumArr = Array.apply(null, {length: 46}).map(Number.call, Number).slice(1);

        async.each(fullNumArr, function(item, callback){

            Numbers.findOne({num: item}, function(err, result){
                (result === null) ? Numbers.create({num: item}, callback) : callback();
            });

        }, function(err){
            if(err) throw err;
            console.log(">>>>>>>>>> Numbers initialed >>>>>>>");
        });
    },


    initStream: function(data, drawDateFrom, numOfRecords){

        var _this = this;

        async.each(data, function(item, asyncCallback){

            var row = item.slice(0, 10).map(function(cell){ return Number(cell); });

            if (row[1] >= drawDateFrom) {

                Draws.findOne({drawid: row[0]}, function(err, result){

                    if (result == null) {

                        var mainArr = item.slice(2, 8).sort(function(a, b){return a-b}),
                            suppleArr = item.slice(8, 10).sort(function(a, b){return a-b});

                        Draws.create({
                            drawid: row[0],
                            drawdate: row[1],
                            main: mainArr,
                            supple: suppleArr
                        }, function(err, draw){
                            if (err) console.error(err);
                            console.log('############ Draw: ' + draw.drawid + ' Saved ############');

                            // create statics collections for all the draws
                            Statics.findOne({drawid: row[0]}, function (err, result){

                                if (result == null) {

                                    Statics.create({
                                        cycle: { drawid: 0, numOfDraws: 0 },
                                        drawid: row[0],
                                        drawdate: row[1],
                                        main: _this.buildStatics(mainArr),
                                        supple: _this.buildStatics(suppleArr)
                                    }, function(err, static){
                                        if (err) console.error(err);
                                        console.log('############ Static: ' + static.drawid + ' Saved ############');

                                        numOfRecords++;
                                        asyncCallback();
                                    });

                                }else{
                                    asyncCallback();
                                }

                            });

                        });

                    }else{
                        asyncCallback();
                    }

                });

            }else{
                asyncCallback();
            }

        }, function(err){
            if(err) console.log(err);

            console.log("######################### all draws imported successfully #########################");
            console.log("######################### " + numOfRecords + " records #########################");

            if (numOfRecords > 0) {
                console.log('All draws has been read and totals ' + numOfRecords + ' records was imported into database successfully');
            } else {
                console.log('No draws was imported into database');
            }

            /* query last 20 result from current draw */
            var queryAllDraws = Draws.find({drawdate: { $gte: _this.drawDateFrom } });
            queryAllDraws.sort({drawdate: -1})
                .select(_this.queryConf.draw)
                .exec(function(err, allStaticResults){
                    if(err) throw err;

                    _this.getDrawsCycles(allStaticResults);
                    _this.getLastResults(allStaticResults, 20);
                });

        });

    },

    getDrawsCycles : function(allDrawsArr){

        var tmpArr = [],
            rsArr = [];

        async.each(allDrawsArr, function(item, callback){

            var numOfDraws = 0,
                temAllDrawsArr = allDrawsArr,
                lastResultsArr = temAllDrawsArr.filter(function(arrItem){ return arrItem["drawdate"] <= item["drawdate"] });

            //console.log(currentDrawDate);
            //console.log(allDrawsArr.length);
            //console.log(lastResultsArr.length);

            for(var i=0; i<lastResultsArr.length; i++){
                numOfDraws = i;
                for(var j=0; j<lastResultsArr[i]["main"].length; j++){
                    tmpArr.push(lastResultsArr[i]["main"][j]);
                }
                var arr = tmpArr.filter(function (item, pos) {return tmpArr.indexOf(item) == pos}).sort(function(a, b){return a-b});
                if(arr.length==45){
                    tmpArr = [];

                    var currentCycle = {
                        drawid: lastResultsArr[i]["drawid"],
                        numOfDraws: numOfDraws
                    }

                    console.log(numOfDraws);
                    console.log(item["drawid"] +": "+ item["drawdate"] + ": " + lastResultsArr[i]["drawid"]);
                    console.log(currentCycle);

                    Statics.update({drawid: item["drawid"]}, { $set: { 'cycle': currentCycle} }, function(err){
                        if(err) throw err;
                        callback();
                    });
                    break;
                }
            }

        }, function(err){
            if(err) throw err;
            console.log("############## Cycle built >>>>>");
        });

        return rsArr;
    },

    getLastNonsArr: function(arrNons){

        var _tmpNonsArr = [];

        for (var i = 0; i < arrNons.length; i++) {
            for (var j = 0; j < arrNons[i]["main"].length; j++) {
                _tmpNonsArr.push(arrNons[i]["main"][j]);
            }
        }

        return _tmpNonsArr.filter(function (item, pos) {return _tmpNonsArr.indexOf(item) == pos}).sort(function(a, b){return a-b});
    },

    getLastWinsArr: function(arrNons){
        var _fullNumArr = Array.apply(null, {length: 46}).map(Number.call, Number).slice(1);
        return _fullNumArr.filter(function (item){ return (arrNons.indexOf(item) === -1)});
    },

    getLastSelectionsArr: function(winsArr, wins){

        var _tmpSelection = [];

        for (var i = 0; i < winsArr.length; i++) {
            var _tmpWinsArr = [];
            for (var j = 0; j < winsArr[i]["main"].length; j++) {
                if (wins.indexOf(winsArr[i]["main"][j]) >= 0) _tmpWinsArr.push(winsArr[i]["main"][j]);
            }
            _tmpSelection.push(_tmpWinsArr);
        }
        return _tmpSelection;
    },

    getLastWinsStatic: function(arrNext, lastObj){

        for (var i = 0; i < arrNext.length; i++) {
            if (lastObj.wins.indexOf(arrNext[i]) >= 0) lastObj.count++;
        }

        lastObj.total = lastObj.wins.length;
        lastObj.rate = Math.round((lastObj.count/lastObj.total) * 10000) / 10000;
    },

    getLastResults: function(arr, nlr){

        var _this = this,
            numOfLastRecords = nlr,
            querySelect = this.queryConf;

        var fullNumFreqsArr = Array.apply(null, new Array(46)).map(Number.prototype.valueOf,0);

        async.each(arr, function(drawRecord, callbackAllStatic){
            console.log("####### drawRecord " + drawRecord.drawid + " beginning to process #######");

            var mainArr = drawRecord.main;
            var last20Stat = {
                next: [],
                winsSelected: {
                    count: 0,
                    total: 0,
                    rate: 0,
                    wins: [],
                    nons: [],
                    selection: []
                },
                nonsSelected: {
                    count: 0,
                    total: 0,
                    rate: 0,
                    wins: [],
                    nons: [],
                    selection: []
                },
                winsArr: [],
                nonsArr: []
            };

            var selectorLast20 = {drawdate: { $lt : drawRecord.drawdate }};
            queryLast20 = Draws.find(selectorLast20);

            queryLast20.sort({drawdate: -1})
                .select(querySelect.draw)
                .limit(numOfLastRecords)
                .exec(function(err, last20Results){
                    if(err) throw err;

                    async.each(last20Results, function(record, callback){

                        var isContainWins = false;
                        async.each(record.main, function(item, callbackMain){

                            if(mainArr.indexOf(item) >= 0) isContainWins = true;

                            fullNumFreqsArr[item] += 1;

                            callbackMain();

                        }, function(err){
                            if(err) throw err;

                            (isContainWins) ?  last20Stat.nonsArr.push(record) : last20Stat.winsArr.push(record);
                            callback();
                        });

                    }, function(err){
                        if(err) throw err;
                        console.log("Draw " + drawRecord.drawid + " last20Result classify done >>>>>>");
                        console.log(fullNumFreqsArr);
                        for(var i=0; i<46; i++){
                            if( (fullNumFreqsArr[i]==0) || (fullNumFreqsArr[i] == 1) ) console.log(i);
                            fullNumFreqsArr[i] = 0;
                        }

                        last20Stat.winsSelected.nons = _this.getLastNonsArr(last20Stat.nonsArr);
                        last20Stat.winsSelected.wins = _this.getLastWinsArr(last20Stat.winsSelected.nons);
                        last20Stat.winsSelected.selection = _this.getLastSelectionsArr(last20Stat.winsArr, last20Stat.winsSelected.wins);

                        last20Stat.nonsSelected.nons = _this.getLastNonsArr(last20Stat.winsArr);
                        last20Stat.nonsSelected.wins = _this.getLastWinsArr(last20Stat.nonsSelected.nons);
                        last20Stat.nonsSelected.selection = _this.getLastSelectionsArr(last20Stat.nonsArr, last20Stat.nonsSelected.wins);

                        var queryNext = {drawdate: { $gt : drawRecord.drawdate }};
                        queryNext = Draws.findOne(queryNext);
                        queryNext.sort({drawdate: 1})
                            .select(querySelect.draw)
                            .exec(function(err, nextResult) {

                                if(nextResult!=null) {
                                    last20Stat.next = nextResult.main.concat(nextResult.supple).sort(function (a, b) {return a - b});

                                    _this.getLastWinsStatic(last20Stat.next, last20Stat.winsSelected);
                                    _this.getLastWinsStatic(last20Stat.next, last20Stat.nonsSelected);

                                    Statics.update({drawid: drawRecord.drawid}, { $set: { 'last20Stat': last20Stat}}, function(err){
                                        if(err) throw err;
                                        callbackAllStatic();
                                    });

                                }else{

                                    last20Stat.winsSelected.total = last20Stat.winsSelected.wins.length;
                                    last20Stat.nonsSelected.total = last20Stat.nonsSelected.wins.length;

                                    Statics.update({drawid: drawRecord.drawid}, { $set: { 'last20Stat': last20Stat}}, function(err){
                                        if(err) throw err;
                                        callbackAllStatic();
                                    });
                                }

                            }); /* END queryNext */

                    });/* END queryLast20 */

                });/* END async */
        }, function(err){
            if(err) throw err;
            console.log('######## allStaticResults have been done #########');
            //console.log(fullNumFreqsArr);
        });
    }
};