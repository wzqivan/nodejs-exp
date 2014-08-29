var express = require('express');
var router = express.Router();

var fs = require('fs');
var csvPath = 'public/resources/LottoSaturday.csv';

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('MongoDB Connected');
});

var Schema = mongoose.Schema;

var usersSchema = new Schema({
    name: String
});


var users = mongoose.model('users', usersSchema);
//console.log(db);

/* GET users listing. */
router.get('/', function(req, res) {

    mongoose.model('users').find(function(err, users){
         res.send(users);
    });
    //res.render('draws', { title: 'Draws' });

    //var rs = fs.createReadStream(csvPath);
    //var ws = fs.createWriteStream('public/resources/ws.csv');
    //rs.pipe(ws);
    //rs.pipe(res);

});

module.exports = router;
