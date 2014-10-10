var express = require('express');
var router = express.Router();
var async = require('async');
var fs = require('fs');
var parse = require('csv-parse');
var csvPath = 'public/resources/LottoSaturday.csv';

require('../model/draw.js')();
require('../model/number.js')();
require('../model/static.js')();

var tools = require('../inc/tools.js');
var mongoose = require('mongoose');
var Draws = mongoose.model('Draw');
var Numbers = mongoose.model('Number');
var Statics = mongoose.model('Static');

var queryConf = {
        draw: "drawid drawdate main supple",
        static: "-_id main supple last20Stat",
        number: "num main supple"
    };

mongoose.connect('mongodb://localhost/draws', function(err){
    if(err) throw err;
    console.log('MongoDB Connected (Mongoose) ##########################');

    //create the initial data for draw number
    var fullNumArr = Array.apply(null, {length: 46}).map(Number.call, Number).slice(1);

    async.each(fullNumArr, function(item, callback){

        Numbers.findOne({num: item}, function(err, result){
            //console.log(result);
            if(result == null){
                Numbers.create({num: item}, callback);
            }
        });

    }, function(err){
        if(err) throw err;
        console.log(">>>>>>>>>> Numbers initialed >>>>>>>");
    });
});



router.get('/build', function(req, res) {

    var _drawDateFrom = 19970130,
        _numOfRecords = 0;

    fs.createReadStream(csvPath).pipe(
        parse({delimiter: ','}, function(err, data){
            if(err) console.log(err);

            data.shift();

            async.each(data, function(item, asyncCallback){

                var row = item.slice(0, 10).map(function(cell){ return Number(cell); });

                if (row[1] >= _drawDateFrom) {

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
                                            main: tools.staticsBuild(mainArr),
                                            supple: tools.staticsBuild(suppleArr)
                                        }, function(err, static){
                                            if (err) console.error(err);
                                            console.log('############ Static: ' + static.drawid + ' Saved ############');

                                            _numOfRecords++;
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

                console.log("######################### imported done #########################");
                console.log("######################### " + _numOfRecords + " records #########################");

                if (_numOfRecords > 0) {
                     console.log('All draws has been read and totals ' + _numOfRecords + ' records was imported into database successfully');
                } else {
                    console.log('No draws was imported into database');
                }

                /* query last 20 result from current draw */
                var queryAllDraws = Draws.find({});
                queryAllDraws.sort({drawdate: -1})
                    .select(queryConf.draw)
                    .exec(function(err, allStaticResults){
                        if(err) throw err;

                        async.each(allStaticResults, function(drawRecord, callbackAllStatic){
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

                            var numOfLast20 = 20,
                                selectorLast20 = {drawdate: { $lt : drawRecord.drawdate }};
                                queryLast20 = Draws.find(selectorLast20);

                            queryLast20.sort({drawdate: -1})
                                .select(queryConf.draw)
                                .limit(numOfLast20)
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
                                            .select(queryConf.draw)
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

                    });

            });

        }) /* END parse */
    ); /* END fs */
});



/* GET Lotto Satuarday Draws listing. */
/* root start from /draws */
router.get('/', function(req, res) {
    //console.dir(res);
    var _drawDateFrom = 20010101,
        _drawDateTo = Number((new Date()).toISOString().slice(0, 10).replace(/-/g, ""));
        // _drawDateTo will be the string so far
        // console.log(_drawDateTo);
        // console.log(typeof _drawDateTo);


    var countUpdate = 0;

    Numbers.find({}, function(err, result){
        console.log(result.length);

        async.each(result, function(item, callback){

            var selector = { main: item.num, drawdate: { $gte: _drawDateFrom, $lte: _drawDateTo }},
                query = Draws.find(selector);

            query.sort({drawdate: 1})
                .select(queryConf.draw)
                .exec(function(err, result){
                    if(err) throw err;

                    var combPairsArr = Array.apply(null, new Array(46)).map(Number.prototype.valueOf,0);

                    for(var i=0; i<result.length; i++){
                        for(var j=0; j<result[i]["main"].length; j++){
                            var idx = result[i]["main"][j];
                            combPairsArr[idx] += 1;
                        }
                    }

                    Numbers.update({num: item.num}, { $set: { 'main.freq': result, 'main.combination.paris': combPairsArr  }}, function(err){
                        if(err) throw err;
                        countUpdate++;
                        callback();
                    });

                });

        }, function(err){
            if(err) console.log(err);
            console.log('>>>>>>>>>> countUpdate:'+countUpdate);

            Draws.find({ drawdate: { $gte: 20140101 }}, queryConf.draw, { sort: { 'drawdate': -1} }, function(err, result){
                if(err) throw err;
                res.send(result);
                console.log('>>>>>>>>>> Draws requested');
                //console.log(result[0]['main']);

                var numArr = Array(45);
                for(var i=0; i<=45; i++){
                    numArr[i]=0;
                }
                numArr.map(function(item){
                    //console.log(item==='');
                });

                async.eachSeries(result, function(item, esCallback){
                    //console.log(item);

//                    Draws.find({ drawdate: { $lte: item.drawdate }}, '').distinct('main', function(err, result){
//                        console.log(result.length);
//                    });

//                Draws.aggregate( { $match: {drawdate: { $lte: item.drawdate }} } )
//                     .limit(20)
//                     .group( { _id: '$drawid'} )
//                     .exec(function(err, result){
//                         console.log(result);
//                    });


                },function(err){
                    console.log('done');
                });

            });
        });/* END async */

    });/* End Numbers */

});

/* /draws/id/:drawid  */
router.get('/id/:drawid', function(req, res) {

    var selector = {drawid: req.params.drawid},
        query = Draws.find(selector),
        queryStat = Statics.findOne(selector);

    query.select(queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;

            if(result.length){
                queryStat.select(queryConf.static)
                    .exec(function(err, statResult){
                        if(err) throw err;

                        // remove the winsArr and nonsArr for result display
                        statResult.last20Stat.winsArr = statResult.last20Stat.nonsArr = [];

                        result.push(statResult);
                        res.send(result);
                });
            }else{
                res.send('The draw ' + req.params.drawid + ' can not be found');
            }
    });

});

/* /draws/id/from/:drawid  */
router.get('/id/from/:drawid', function(req, res) {

    var query = Draws.find({ drawid: { $gte: req.params.drawid }});
    query.select(queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });
});


/* /draws/date/:drawdate  */
router.get('/date/:drawdate', function(req, res) {

    var selector = {drawdate: req.params.drawdate},
        query = Draws.find(selector),
        queryStat = Statics.findOne(selector);

    query.select(queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;

            if(result.length){
                queryStat.select(queryConf.static)
                    .exec(function(err, statResult){
                        result.push(statResult);
                        res.send(result);
                    });
            }else{
                res.send('The draw ' + req.params.drawdate + ' can not be found');
            }
         });

});

/* /draws/date/from/:drawdate  */
router.get('/date/from/:drawdate', function(req, res) {

    var query = Draws.find({ drawdate: { $gte: req.params.drawdate }});
    query.select(queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/date/from/:drawdatefrom/to/:drawdateto  */
router.get('/date/from/:drawdatefrom/to/:drawdateto', function(req, res) {

    var query = Draws.find({ drawdate: { $gte: req.params.drawdatefrom, $lt: req.params.drawdateto }});
    query.select(queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/number/  */
router.get('/number/', function(req, res) {

    var query = Numbers.find({});
    query.select(queryConf.number)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/number/:num  */
router.get('/number/:num', function(req, res) {

    var query = Numbers.find({num: req.params.num});
    query.select(queryConf.number)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});



module.exports = router;
