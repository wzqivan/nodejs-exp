var async = require('async');
var mongoose = require('mongoose');
var Draws = mongoose.model('Draw');
var Numbers = mongoose.model('Number');
var Statics = mongoose.model('Static');


module.exports = {

    queryConf : {
        draw: "drawid drawdate main supple",
        static: "-_id main supple last20Stat",
        number: "num main supple"
    },

    cycles : [],

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
            result.sum += item;

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
            var queryAllDraws = Draws.find({});
            queryAllDraws.sort({drawdate: -1})
                .select(_this.queryConf.draw)
                .exec(function(err, allStaticResults){
                    if(err) throw err;

                    _this.cycles = _this.getDrawsCycles(allStaticResults);
                    _this.getLastResults(allStaticResults, 20);
                });

        });

    },

    getDrawsCycles : function(arr){

        var tmpArr = [],
            rsArr = [];

        async.eachSeries(arr, function(item, callback){

            for(var i=0; i<item["main"].length; i++){
                tmpArr.push(item["main"][i]);
            }
            var arr = tmpArr.filter(function (item, pos) {return tmpArr.indexOf(item) == pos}).sort(function(a, b){return a-b});
            if(arr.length==45){
                rsArr.push(item["drawid"]);
                tmpArr = [];
            }
            callback();

        }, function(err){
            if(err) throw err;
            console.log("############## Cycle built >>>>>");
        });

        return rsArr;
    },

    getLastResults: function(arr, nlr){

        var numOfLastRecords = nlr,
            querySelect = this.queryConf;

        async.each(arr, function(drawRecord, callbackAllStatic){
            console.log("####### drawRecord " + drawRecord.drawid + " beginning to process #######");

            var mainArr = drawRecord.main;
            var last20Stat = {
                count: 0,
                total: 0,
                rate: 0,
                next: [],
                wins: [],
                nons: [],
                winsArr: [],
                nonsArr: [],
                selection: []
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
                            callbackMain();

                        }, function(err){
                            if(err) throw err;

                            (isContainWins) ?  last20Stat.nonsArr.push(record) : last20Stat.winsArr.push(record);
                            callback();
                        });

                    }, function(err){
                        if(err) throw err;
                        console.log("Draw " + drawRecord.drawid + " last20Result classify done >>>>>>");

                        var tmpWinsArr = [];
                        var fullNumArr = Array.apply(null, {length: 46}).map(Number.call, Number).slice(1);

                        for(var i=0; i<last20Stat.winsArr.length; i++){
                            for(var j=0; j<last20Stat.winsArr[i]["main"].length; j++){
                                tmpWinsArr.push(last20Stat.winsArr[i]["main"][j]);
                            }
                        }

                        last20Stat.nons = tmpWinsArr.filter(function (item, pos) {return tmpWinsArr.indexOf(item) == pos}).sort(function(a, b){return a-b});
                        last20Stat.wins = fullNumArr.filter(function (item){ return (last20Stat.nons.indexOf(item) === -1)});

                        //remove the non-wins number from nonsArr
                        for(var i=0; i<last20Stat.nonsArr.length; i++){
                            var tmpNonsArr = [];
                            for(var j=0; j<last20Stat.nonsArr[i]["main"].length; j++){
                                if(last20Stat.wins.indexOf(last20Stat.nonsArr[i]["main"][j]) >= 0) tmpNonsArr.push(last20Stat.nonsArr[i]["main"][j]);
                            }
                            last20Stat.selection.push(tmpNonsArr);
                        }


                        var queryNext = {drawdate: { $gt : drawRecord.drawdate }};
                        queryNext = Draws.findOne(queryNext);
                        queryNext.sort({drawdate: 1})
                            .select(querySelect.draw)
                            .exec(function(err, nextResult) {

                                if(nextResult!=null) {
                                    last20Stat.next = nextResult.main.concat(nextResult.supple).sort(function (a, b) {return a - b});
                                    for(var i=0; i<last20Stat.next.length; i++){
                                        if (last20Stat.wins.indexOf(last20Stat.next[i]) >= 0) last20Stat.count++;
                                    }
                                    last20Stat.total = last20Stat.wins.length;
                                    last20Stat.rate = Math.round((last20Stat.count/last20Stat.total) * 10000) / 10000;

                                    Statics.update({drawid: drawRecord.drawid}, { $set: { 'last20Stat': last20Stat}}, function(err){
                                        if(err) throw err;
                                        callbackAllStatic();
                                    });

                                }else{
                                    last20Stat.total = last20Stat.wins.length;
                                    //last20Stat.winsArr = last20Stat.nonsArr = [];
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
        });
    }
};