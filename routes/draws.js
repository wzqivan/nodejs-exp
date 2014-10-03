var express = require('express');
var router = express.Router();
var async = require('async');
var fs = require('fs');
var parse = require('csv-parse');
var csvPath = 'public/resources/LottoSaturday.csv';

require('../model/draw.js')();
require('../model/number.js')();
require('../model/static.js')();

var mongoose = require('mongoose');
var Draws = mongoose.model('Draw');
var Numbers = mongoose.model('Number');
var Statics = mongoose.model('Static');

var queryConf = {
        field: 'drawid drawdate main supple',
        static: '-_id main supple'
    };

mongoose.connect('mongodb://localhost/draws', function(err){
    if(err) throw err;
    console.log('MongoDB Connected (Mongoose) ##########################');

    //create the initial data for draw number
    var numberArr = [];
    for(var i=1; i<=45; i++){
        numberArr.push(i);
    }

//    var testArr = Array.apply(null, {length: 45}).map(Number.call, Number);
//    console.log(testArr);
//    console.log(testArr.length);

    async.each(numberArr, function(item, callback){

        Numbers.findOne({num: item}, function(err, result){
            //console.log(result);
            if(result == null){
                Numbers.create({num: item}, callback);
            }
        });

    }, function(err){
        if(err) throw err;
        console.log(">>>>>>>>>> Numbers created");
    });
});


function staticsBuild (arr){

    var result = {
        sum: 0,
        avg: 0,
        pOdd: [],
        pEven: [],
        gLow: [],
        gLowMed: [],
        gMed: [],
        gHighMed: [],
        gHigh: []
    }

    arr.map(function(item){
        result.sum += item;

        if ((item % 2) !== 0) {
            result.pOdd.push(item);
        } else {
            result.pEven.push(item);
        }

        if (item < 10) {
            result.gLow.push(item);
        }
        if (item >= 10 && item < 20) {
            result.gLowMed.push(item);
        }
        if (item >= 20 && item < 30) {
            result.gMed.push(item);
        }
        if (item >= 30 && item < 40) {
            result.gHighMed.push(item);
        }
        if (item >= 40) {
            result.gHigh.push(item);
        }
    });

    result.avg = Math.round(result.sum/arr.length);

    return result;
};



router.get('/build', function(req, res) {

    var _drawDateFrom = 19970130,
        _numOfRecords = 0;

    fs.createReadStream(csvPath).pipe(
        parse({delimiter: ','}, function(err, data){
            if(err) console.log(err);

            data.shift();

            async.each(data, function(item, asyncCallback){
                //console.log(item);

                for(var i = 0; i < 10; i++ ){
                    item[i] = Number(item[i]);
                };

                if (item[1] >= _drawDateFrom) {

                    Draws.findOne({drawid: item[0]}, function(err, result){

                        if (result == null) {

                            var mainArr = item.slice(2, 8).sort(function(a, b){return a-b}),
                                suppleArr = item.slice(8, 10).sort(function(a, b){return a-b});

                            Draws.create({
                                drawid: item[0],
                                drawdate: item[1],
                                main: mainArr,
                                supple: suppleArr
                            }, function(err, draw){
                                if (err) console.error(err);
                                console.log('############ Draw: ' + draw.drawid + ' Saved ############');

                                // create statics collections for all the draws
                                Statics.findOne({drawid: item[0]}, function(err, result){

                                    if (result == null) {

                                        Statics.create({
                                            drawid: item[0],
                                            drawdate: item[1],
                                            main: staticsBuild(mainArr),
                                            supple: staticsBuild(suppleArr)
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
                     res.send('All draws has been read and totals ' + _numOfRecords + ' records was imported into database successfully');
                } else {
                     res.send('No draws was imported into database');
                }
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
                .select(queryConf.field)
                .exec(function(err, result){
                    if(err) throw err;
                    //console.log(result);
                    //console.log("##############################################################");

                    var combPairsArr = Array.apply(null, new Array(46)).map(Number.prototype.valueOf,0);

                    for(var i=0; i<result.length; i++){
                        for(var j=0; j<result[i]["main"].length; j++){
                            var idx = result[i]["main"][j];
                            //console.log(idx);
                            combPairsArr[idx] += 1;
                        }
                    }

                    console.log(combPairsArr);
                    Numbers.update({num: item.num}, { $set: { 'main.freq': result, 'main.combination.paris': combPairsArr  }}, function(err){
                        if(err) throw err;
                        countUpdate++;
                        callback();
                    });

                });

        }, function(err){
            if(err) console.log(err);
            console.log('>>>>>>>>>> countUpdate:'+countUpdate);

//        Numbers.find({num: 25}, function(err, result){
//            if(err) throw err;
//            res.send(result);
//            console.log('>>>>>>>>>> Numbers freq updated');
//        });

            Draws.find({ drawdate: { $gte: 20140101 }}, queryConf.field, { sort: { 'drawdate': -1} }, function(err, result){
                if(err) throw err;
                res.send(result);
                console.log('>>>>>>>>>> Draws requested');
                console.log(result[0]['main']);

                var numArr = Array(45);
                for(var i=0; i<=45; i++){
                    numArr[i]=0;
                }
                numArr.map(function(item){
                    //console.log(item==='');
                });

                //console.log(numArr);

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

    query.select(queryConf.field)
         .exec(function(err, result){
            if(err) throw err;

            if(result.length){
                queryStat.select(queryConf.static)
                         .exec(function(err, statResult){
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
    query.select(queryConf.field);
    query.exec(function(err, result){
        if(err) throw err;
        res.send(result);
    });
});


/* /draws/date/:drawdate  */
router.get('/date/:drawdate', function(req, res) {

    var selector = {drawdate: req.params.drawdate},
        query = Draws.find(selector),
        queryStat = Statics.findOne(selector);

    query.select(queryConf.field)
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
    query.select(queryConf.field);
    query.exec(function(err, result){
        if(err) throw err;
        res.send(result);
    });

});

/* /draws/date/from/:drawdatefrom/to/:drawdateto  */
router.get('/date/from/:drawdatefrom/to/:drawdateto', function(req, res) {

    var query = Draws.find({ drawdate: { $gte: req.params.drawdatefrom, $lt: req.params.drawdateto }});
    query.select(queryConf.field);
    query.exec(function(err, result){
        if(err) throw err;
        res.send(result);
    });

});


module.exports = router;
