const n2words = require('n2words')
module.exports = {
    formatNumberToText:function(countryCode,value){
        let language = countryCode.toLowerCase();//TODO:connect country with language in new entity!

        // parse to fload in case value has type string to continue
        if(typeof value === 'string' || value instanceof String){
            value = parseFloat(value);
        }
        //round to two decimals
        value = Math.round((value + Number.EPSILON) * 100) / 100;

        //specific logic for italy with decimals
        //only convert digits before comma
        //keep decimals as numbers
        if(language === "it" && value % 1 !== 0){
            return `${n2words(Math.floor(value), {lang: language})}`;
        }
        //set language to "en" for all other countries besides "it"
        if(language !== "it"){
            language = "en";
        }
        //convert number to words
        let words = n2words(value, {lang: language});
        //apply rules for en
        if(language === "en"){
            words = words.replace(/ and /g," ").replace("point","and");
            words += " cents";
        }
        return words;
    }
};