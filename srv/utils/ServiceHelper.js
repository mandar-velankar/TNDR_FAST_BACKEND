const cds = require('@sap/cds');
const moment = require('moment');
// const NumberFormat = require('./sap/ui/core/format/NumberFormat'); TODO how to include a javascript lib in node.js?

module.exports = {
    _getWhereId: function(req, fieldName){
        return req.query.SELECT.where.findIndex((filter) => filter && filter.ref && filter.ref.find((field) => field === fieldName));
    },

    getWhereId: function (req, fieldName) {
        return this._getWhereId(req, fieldName);
    },

    getWhereValue: function(req, fieldName) {
        let idx = this._getWhereId(req, fieldName);
        return req.query.SELECT.where[idx + 2].val;
    },

    getWhereValues: function(req, fieldName) {
        let results = [];

        function traverse(arr) {
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                if (Array.isArray(item)) {
                    traverse(item);
                } else if (item.ref && item.ref[0] === fieldName) {
                    // Check if the next item is a '=' operator
                    const nextItem = arr[i + 1];
                    if (nextItem === '=') {
                        // The InstituteId should be two positions ahead
                        const idItem = arr[i + 2];
                        if (idItem && idItem.val !== undefined) {
                            results.push(idItem.val);
                        }
                    }
                } else if (item.xpr) {
                    // If it's an expression, recursively traverse it
                    traverse(item.xpr);
                }
            }
        }

        traverse(req.query.SELECT.where);
        return results;
    },

    /**
     * Deletes a filter from the request
     * @param {Object} req 
     * @param {string} fieldName 
     */
     deleteFilter: function(req, fieldName){
        const index = this.getWhereId(req, fieldName);
        if(index >= 0 ){
            req.query.SELECT.where.splice(index,3);

            // remove trailing "and" && "or" if any
            if(req.query.SELECT.where[index] === "and" || req.query.SELECT.where[index] === "or"){
                req.query.SELECT.where.splice(index,1);
            }

            // remove leading "and" && "or" if any
            if(req.query.SELECT.where[index-1] === "and" || req.query.SELECT.where[index-1] === "or"){
                req.query.SELECT.where.splice(index-1,1);
            }
        }

    },

    buildWhereExpression: function(fieldName, operator, fieldValues) {

        let expr = '';
        
        fieldValues.forEach((value, idx, arr) => {

            const last  = arr.length - 1;
            expr += `${fieldName} = ${value}`; 

            if(idx != last){
                expr += ` ${operator} `;
            }

        });

        return cds.parse.expr(expr).xpr;
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

    formatNumber: function(num, minDigits, maxDigits) {
        if (!num){
            num = 0;
        }

        return num.toLocaleString('en-US', {
            minimumFractionDigits: minDigits, 
            maximumFractionDigits: maxDigits
        });
    },

    formatDate(dateString, inputFormat, outputFormat) {
        return moment(dateString, inputFormat).format(outputFormat);
    },

    formatCurrency: function (num, locale, minDigits, maxDigits, truncate) {
		if (!num){
            num = 0;
        };

        if (truncate) {
            num = Number((Math.floor(num * 100) / 100).toFixed(2));
        }

        return num.toLocaleString(locale, {
            minimumFractionDigits: minDigits, 
            maximumFractionDigits: maxDigits
        });
	}


/*
    //format price
	price: function (price) {
		if (!price){
			return "";
		}
		var oNumberFormat = NumberFormat.getFloatInstance({
			maxFractionDigits: 2,
			groupingEnabled: true,
			groupingSeparator: ",",
			decimalSeparator: "."
		});
		var oValue = oNumberFormat.format(parseFloat(price));
		if (currency === undefined){
			return oValue;
		}
		return oValue;
	},

	//format price depending on Pack or Unit
	priceTwoOrFour: function (price, unit) {
		if (!price){
			return "";
		}
		var oNumberFormat = NumberFormat.getFloatInstance({
			maxFractionDigits: unit !== "Pack" ? 4 : 2,
			groupingEnabled: true,
			groupingSeparator: ",",
			decimalSeparator: "."
		});
		var oValue = oNumberFormat.format(parseFloat(price));
		if (!currency){
			return oValue;
		}
		return oValue;
	}
*/

}


//module.exports = { getWhereId, getWhereValue, buildWhere, buildFullWhere, isEquivalent, isDoubleEqual, formatNumber}