var express = require('express');
var router = express.Router();

var fs = require('fs');
var csv = require("fast-csv");
var csvPath = 'public/resources/LottoSaturday.csv';

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/draws');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('MongoDB Connected ##########################');
});


var Schema = mongoose.Schema;
var drawsSchema = new Schema({
    drawid: Number,
    drawdate: Number,
    main: [Number],
    supple: [Number]
});
var Draws = mongoose.model('Draws', drawsSchema);


router.get('/build', function(req, res) {

     var _drawDateFrom = 19970130,
         _numOfRecords = 0;

     csv.fromPath(csvPath)
        .on("record", function (data, i) {

            if (i > 0) {

                for(var j = 0; j < 10; j++ ){
                    data[j] = Number(data[j]);
                };

                // capture the data since 1997.2
                if (data[1] > _drawDateFrom) {

                    Draws.findOne( { 'drawid' : Number(data[0]) }, function(err, result){

                        if (result == null) {

                            var mainArr = data.slice(2, 8),
                                suppleArr = data.slice(8, 10);

                            mainArr.sort(function(a, b){return a-b});
                            suppleArr.sort(function(a, b){return a-b});
                            //console.log(mainArr);
                            //console.log(suppleArr);

                            var draw = new Draws({
                                drawid: Number(data[0]),
                                drawdate: Number(data[1]),
                                main: mainArr,
                                supple: suppleArr
                            });

                            draw.save(function (err, draw) {
                                console.log('############ Saved ############');
                                if (err) {
                                    console.dir(draw);
                                    console.error(err);
                                }
                                console.dir(draw);
                                _numOfRecords++;
                            });

                        }

                    });

                }

            }

        })
        .on("end", function(){
            console.log("######################### done #########################");

             if (_numOfRecords > 0) {
                 res.send('All draws has been read and totals ' + _numOfRecords + ' records was imported into database successfully');
             } else {
                 res.send('No draws was imported into database');
             }

        });

});



/* GET Lotto Satuarday Draws listing. */
/* root start from /draws */
router.get('/', function(req, res) {

    var temArr = new Array(45);

    Draws.find( { 'main': 25 , 'drawdate': { $gte: 20100101 } } , function(err, result){
        if (err) return handleError(err);
        //console.log(result.length);

//        for (var i = 0; i < result.length; i++) {
//            var item = result[i]['main'];
//
//            for (var j = 0; j < item.length; j++) {
//                var tmpItem = item[j];
//                if(temArr[tmpItem]==undefined) temArr[tmpItem] = 0;
//                temArr[tmpItem]++;
//            }
//        }
//        console.log(temArr);

        res.send(result);
    });

});

/* /draws/id/:drawid  */
router.get('/id/:drawid', function(req, res) {

    Draws.find( { 'drawid': req.params.drawid }, function(err, result){
        if (err) return handleError(err);
        res.send(result);
    });

});

/* /draws/id/from/:drawid  */
router.get('/id/from/:drawid', function(req, res) {

    Draws.find( { 'drawid': { $gte: req.params.drawid } }, function(err, result){
        if (err) return handleError(err);
        res.send(result);
    });

});


/* /draws/date/:drawdate  */
router.get('/date/:drawdate', function(req, res) {

    Draws.find( { 'drawdate': req.params.drawdate }, function(err, result){
        if (err) return handleError(err);
        res.send(result);
    });

});

/* /draws/date/from/:drawdate  */
router.get('/date/from/:drawdate', function(req, res) {

    Draws.find( { 'drawdate': { $gte: req.params.drawdate } }, function(err, result){
        if (err) return handleError(err);
        res.send(result);
    });

});

/* /draws/date/from/:drawdatefrom/to/:drawdateto  */
router.get('/date/from/:drawdatefrom/to/:drawdateto', function(req, res) {

    Draws.find( { 'drawdate': { $gte: req.params.drawdatefrom, $lt: req.params.drawdateto } }, function(err, result){
        if (err) return handleError(err);
        res.send(result);
    });

});


module.exports = router;
