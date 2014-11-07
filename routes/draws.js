var express = require('express');
var router = express.Router();
var async = require('async');
var fs = require('fs');
var parse = require('csv-parse');
var csvPath = 'public/resources/TattsLotto.csv';

require('../model/draw.js')();
require('../model/number.js')();
require('../model/static.js')();

var tools = require('../inc/tools.js');
var mongoose = require('mongoose');
var Draws = mongoose.model('Draw');
var Numbers = mongoose.model('Number');
var Statics = mongoose.model('Static');


mongoose.connect('mongodb://localhost/draws', function(err){
    if(err) throw err;
    console.log('MongoDB Connected (Mongoose) ##########################');
});



router.get('/build', function(req, res) {

    var _drawDateFrom = 19970130,
        _numOfRecords = 0;

    tools.initNumbers();

    fs.createReadStream(csvPath).pipe(
        parse({delimiter: ','}, function(err, data){
            if(err) console.log(err);

            data.shift();
            tools.initStream(data, _drawDateFrom, _numOfRecords);
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

    console.log(tools.cycles);

    var queryAllDraws = Draws.find({});

        queryAllDraws.sort({drawdate: -1})
            .select(tools.queryConf.draw)
            .exec(function(err, result){
                if(err) throw err;
                res.send(result);
            });

    /* var countUpdate = 0;

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

  //  });/* End Numbers */


});

/* /draws/id/:drawid  */
router.get('/id/:drawid', function(req, res) {

    var selector = {drawid: req.params.drawid},
        query = Draws.find(selector),
        queryStat = Statics.findOne(selector);

    query.select(tools.queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;

            if(result.length){
                queryStat.select(tools.queryConf.static)
                    .exec(function(err, statResult){
                        if(err) throw err;

                        // remove the winsArr and nonsArr for result display
                        console.log(statResult.last20Stat.winsArr.length + "/" + statResult.last20Stat.nonsArr.length);
                        console.log(tools.cycles);
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
    query.select(tools.queryConf.draw)
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

    query.select(tools.queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;

            if(result.length){
                queryStat.select(tools.queryConf.static)
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
    query.select(tools.queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/date/from/:drawdatefrom/to/:drawdateto  */
router.get('/date/from/:drawdatefrom/to/:drawdateto', function(req, res) {

    var query = Draws.find({ drawdate: { $gte: req.params.drawdatefrom, $lt: req.params.drawdateto }});
    query.select(tools.queryConf.draw)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/number/  */
router.get('/number/', function(req, res) {

    var query = Numbers.find({});
    query.select(tools.queryConf.number)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});

/* /draws/number/:num  */
router.get('/number/:num', function(req, res) {

    var query = Numbers.find({num: req.params.num});
    query.select(tools.queryConf.number)
         .exec(function(err, result){
            if(err) throw err;
            res.send(result);
    });

});



module.exports = router;
