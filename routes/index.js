var express = require('express');
var router = express.Router();

/* GET Home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});


/* GET Users page. */
//router.get('/users', function(req, res) {
//  res.render('users', { title: 'Users' });
//});


/* GET Draws page. */
//router.get('/draws', function(req, res) {
//  res.render('draws', { title: 'Draws' });
//});

module.exports = router;
