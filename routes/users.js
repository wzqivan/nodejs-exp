var express = require('express');
var router = express.Router();

var fs = require('fs');
var parse = require('csv-parse');
var async = require('async');

/* GET users listing. */
router.get('/', function(req, res) {


    //var parser = parse({delimiter: ','}, function(err, data){
        //console.log(data[1]);
    //});

    //res.send('respond with a resource');
    fs.createReadStream('public/resources/LottoSaturday.csv').pipe(
        parse({delimiter: ','}, function(err, data){
            if(err) console.log(err);

            //console.log(data);
            data.shift();

            async.each(data, function(item, callback){
                //console.log(item);
                console.log('############ Draw: ' + item[0] + ' Saved ############');
                 callback();
            }, function(err){
                if(err) console.log(err);

                console.log("######################### imported done #########################");
                console.log("######################### " + data.length + " records #########################");
            });

        })
    );

    //res.render('users', { title: 'Users' });
});

module.exports = router;
