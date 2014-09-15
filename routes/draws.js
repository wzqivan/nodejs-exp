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
    winning: [Number],
    supplementary: [Number]
});
var Draws = mongoose.model('Draws', drawsSchema);


router.get('/build', function(req, res) {

    csv.fromPath(csvPath)
       .on("record", function(data,i) {
//            console.log(data);
//            if(data[0] > 3000){
//                console.log(data[0] + " " + data[1] + " " + data[2] + " " + data[3] + " " + data[4] + " " + data[5]+ " " + data[6]+ " " + data[7] + " " + data[8] + " " + data[9]);
//            }

            if (i != 0) {

                if (data[8] == null) data[8] = 0;

                var draw = new Draws({
                    drawid: Number(data[0]),
                    drawdate: Number(data[1]),
                    winning: [
                        data[2], data[3], data[4], data[5], data[6]
                    ],
                    supplementary: [
                        data[7], data[8]
                    ]
                });

                draw.save(function (err, draw) {
                    console.log('############ Saved ############');
                    if (err) {
                        console.dir(draw);
                        console.error(err);
                    }
                    console.dir(draw);
                });
            }

       })
       .on("end", function(){
            console.log("######################### done #########################");
            res.send('All draws has been imported into database successfully');
       });

});



/* GET Lotto Satuarday Draws listing. */
/* root start from /draws */
router.get('/id', function(req, res) {

    Draws.find( { 'winning': 25 , 'drawdate': { $gte: 20120101 } } , function(err, result){
        if (err) return handleError(err);
        console.log(result.length);
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
