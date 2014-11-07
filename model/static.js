// import the necessary modules
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// create an export function to encapsulate the model creation
module.exports = function() {
    var staticsSchema = new Schema({
        cycle: {
            drawid: Number,
            numOfDraws: Number
        },
        drawid: Number,
        drawdate: Number,
        main: {
            sum: Number,
            avg: Number,
            group: {
                low: [Number],
                lowMed: [Number],
                med: [Number],
                highMed: [Number],
                high: [Number]
            },
            parity: {
                even: [Number],
                odd: [Number]
            }
        },
        supple: {
            sum: Number,
            avg: Number,
            group: {
                low: [Number],
                lowMed: [Number],
                med: [Number],
                highMed: [Number],
                high: [Number]
            },
            parity: {
                even: [Number],
                odd: [Number]
            }
        },
        last20Stat: {
            next: [],
            winsSelected: {
                count: 0,
                total: 0,
                rate: 0,
                wins: [],
                nons: [],
                selection: []
            },
            nonsSelected: {
                count: 0,
                total: 0,
                rate: 0,
                wins: [],
                nons: [],
                selection: []
            },
            winsArr: [],
            nonsArr: []
        }
    });
    mongoose.model('Static', staticsSchema);
};