const XlsxTemplate = require('xlsx-template');
const { Readable } = require('stream');
const fs = require('fs');
const path = require('path');

exports.generateXLSX = (templatename, values)=>{

    // Load an XLSX file into memory
    const filedata = fs.readFileSync(path.join(__dirname, '../xlsx-templates', templatename));

    // Create a template
    var template = new XlsxTemplate(filedata);

    // Replacements take place on first sheet
    var sheetNumber = 1;

    // Perform substitution
    template.substitute(sheetNumber, values);

    // Get binary data
    let excel =  template.generate({type:'uint8array'});
    const readableInstanceStream = new Readable({
        read() {
            this.push(excel);
            this.push(null);
        }
    });
    return {
        value: readableInstanceStream
    };
};