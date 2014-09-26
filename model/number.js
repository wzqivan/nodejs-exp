// import the necessary modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
    var numberSchema = new Schema({
        num: Number,
        main: {
            freq: [],
            combination: {
                paris: [],
                triplets: []
            }
        },
        supple: {
            freq: [],
            combination: {
                paris: []
            }
        }
    });
    mongoose.model('Number', numberSchema);
};