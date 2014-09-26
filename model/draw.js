// import the necessary modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
    var drawsSchema = new Schema({
        drawid: Number,
        drawdate: Number,
        main: [Number],
        supple: [Number]
    });
    mongoose.model('Draw', drawsSchema);
};