var express = require('express');
var router = express.Router();

var fs = require('fs');
var csv = require("fast-csv");
var csvPath = 'public/resources/LottoSaturday.csv';

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/lottosaturday');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('MongoDB Connected');
});

var Schema = mongoose.Schema;
var drawsSchema = new Schema({
    drawid: String,
    drawdate: Number,
    winning: [Number],
    supplementary: [Number]
});

//var usersSchema = new Schema({
//    name: String
//});
//
//
//var users = mongoose.model('users', usersSchema);
//var testUser = new users(
//    {name: 'testname7' }
//);
//
//testUser.save(function(err, testUser) {
//    if (err) return console.error(err);
//    console.dir(testUser);
//});
//console.log(db);


/* GET Lotto Satuarday Draws listing. */
/* root start from /draws */
router.get('/', function(req, res) {

//    mongoose.model('users').find(function(err, users){
//        console.log(users);
//        res.send(users);
//    });

    var draws = mongoose.model('draws', drawsSchema);
    draws.findOne({ 'drawid': '3453'}, function(err){
        if (err) return handleError(err);
    });
    //console.log(draws.find());
//    res.send(function(){
//        draws.findOne({ drawid: '3453'}, function(err){
//            if (err) return handleError(err);
//        });
//    });


//    var rs = fs.createReadStream(csvPath);
//    var ws = fs.createWriteStream('public/resources/ws.csv');
//    rs.pipe(ws);
//    rs.pipe(res);

});

router.get('/build', function(req, res) {

    var draws = mongoose.model('drawsdraws', drawsSchema);

    csv.fromPath(csvPath)
        .on("record", function(data,i) {
//            console.log(data);
//            if(data[0] > 3000){
//                console.log(data[0] + " " + data[1] + " " + data[2] + " " + data[3] + " " + data[4] + " " + data[5]+ " " + data[6]+ " " + data[7] + " " + data[8] + " " + data[9]);
//            }

            if (i != 0) {

                if (data[8] == null) data[8] = 0;

                var draw = new draws({
                    drawid: data[0],
                    drawdate: data[1],
                    winning: [
                        data[2], data[3], data[4], data[5], data[6]
                    ],
                    supplementary: [
                        data[7], data[8]
                    ]
                });

                draw.save(function (err, draw) {
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

module.exports = router;
