var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var draws = require('./routes/draws');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(favicon());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);
app.use('/draws', draws);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


//var fs = require('fs');
//var rs = fs.createReadStream('public/resources/LottoSaturday.csv');
//var ws = fs.createWriteStream('public/resources/ws.csv');
//rs.pipe(ws);


//var stream = fs.createReadStream("public/resources/LottoSaturday.csv");
var csv = require("fast-csv");
csv.fromPath("public/resources/LottoSaturday.csv")
    .on("record", function(data){
        //console.log(data);
        //if(data[0] > 3000){
            //console.log(data[0] + " " + data[1] + " " + data[2] + " " + data[3] + " " + data[4] + " " + data[5]+ " " + data[6]+ " " + data[7] + " " + data[8] + " " + data[9]);
//            console.log(typeof data[0]);  String
//            console.log(typeof data[1]);
//            console.log(typeof data[2]);
//            console.log(typeof data[3]);
        //}
    })
    .on("end", function(){
        console.log("######################### done #########################");
    });

/// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;
