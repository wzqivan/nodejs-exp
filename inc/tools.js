module.exports = {

    staticsBuild: function(arr){

        var result = {
            sum: 0,
            avg: 0,
            group: {
                low: [],
                lowMed: [],
                med: [],
                highMed: [],
                high: []
            },
            parity: {
                even: [],
                odd: []
            }
        }

        arr.map(function(item){
            result.sum += item;

            if ((item % 2) !== 0) {
                result.parity.odd.push(item);
            } else {
                result.parity.even.push(item);
            }

            if (item < 10) {
                result.group.low.push(item);
            }
            if (item >= 10 && item < 20) {
                result.group.lowMed.push(item);
            }
            if (item >= 20 && item < 30) {
                result.group.med.push(item);
            }
            if (item >= 30 && item < 40) {
                result.group.highMed.push(item);
            }
            if (item >= 40) {
                result.group.high.push(item);
            }
        });

        result.avg = Math.round(result.sum/arr.length);

        return result;
    }


};