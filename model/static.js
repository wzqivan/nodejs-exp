// import the necessary modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
    var staticsSchema = new Schema({
        drawid: Number,
        drawdate: Number,
        main: {
            sum: Number,
            avg: Number,
            pOdd: [Number],
            pEven: [Number],
            gLow: [Number],
            gLowMed: [Number],
            gMed: [Number],
            gHighMed: [Number],
            gHigh: [Number]
        },
        supple: {
            sum: Number,
            avg: Number,
            pOdd: [Number],
            pEven: [Number],
            gLow: [Number],
            gLowMed: [Number],
            gMed: [Number],
            gHighMed: [Number],
            gHigh: [Number]
        }
    });
    mongoose.model('Static', staticsSchema);
};