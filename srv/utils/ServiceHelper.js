module.exports = {
    _getWhereId: function(req, fieldName){
        return req.query.SELECT.where.findIndex((filter) => filter && filter.ref && filter.ref.find((field) => field === fieldName));
    },

    getWhereId: function (req, fieldName) {
        return _getWhereId(req, fieldName);
    },

    getWhereValue: function(req, fieldName) {
        let idx = this._getWhereId(req, fieldName);
        return req.query.SELECT.where[idx + 2].val;
    },

    buildWhere: function(req, fieldName) {
        let result = [];
        idx = this._getWhereId(req, fieldName);
        if (idx !== -1){
            result.push(req.query.SELECT.where[idx]);
            result.push(req.query.SELECT.where[idx + 1]);
            result.push(req.query.SELECT.where[idx + 2]);
        }
        return result;
    },

    buildFullWhere: function(fieldName, comparisonOperator, fieldValue) {
        let result = [];
        result.push({
            ref: [fieldName]
        });
        result.push(comparisonOperator);
        result.push({
            val: fieldValue
        });
        return result;
    },

    isEquivalent: function(a, b) {
        // Create arrays of property names
        var aProps = Object.getOwnPropertyNames(a);
        var bProps = Object.getOwnPropertyNames(b);

        // If number of properties is different,
        // objects are not equivalent
        if (aProps.length != bProps.length) {
            return false;
        }

        for (var i = 0; i < aProps.length; i++) {
            var propName = aProps[i];

            // If values of same property are not equal,
            // objects are not equivalent
            if (a[propName] !== b[propName]) {
                return false;
            }
        }

        // If we made it this far, objects
        // are considered equivalent
        return true;
    },

    isDoubleEqual: function(x, y){
        const doubleComparisonThreshold = 0.0001;
        return (Math.abs(x - y) < doubleComparisonThreshold) ? true : false;
    },

    isDoubleXBelowY: function(x, y){
        const doubleComparisonDigits = 4;
        return Math.round(10000*x) / 10000  < Math.round(10000*y) / 10000 ? true : false;
    },

    isDoubleXBelowEqualY: function(x, y){
        const doubleComparisonDigits = 4;
        return Math.round(10000*x) / 10000  <= Math.round(10000*y) / 10000 ? true : false;
    },

    formatNumber: function(num, digits) {
        if (!num){
            num = 0;
        }
        num = num.toFixed(digits);
        return num.toLocaleString();
    }
}


//module.exports = { getWhereId, getWhereValue, buildWhere, buildFullWhere, isEquivalent, isDoubleEqual, formatNumber}