var XlsxTemplate = require('xlsx-template');

export async function getTemplate(templatename, values) {

    // Load an XLSX file into memory
    const filedata = await fs.readFile(path.join(__dirname, 'xlsx-templates', templatename);

    // Create a template
    var template = new XlsxTemplate(filedata);

    // Replacements take place on first sheet
    var sheetNumber = 1;

    // Perform substitution
    template.substitute(sheetNumber, davaluesta);

    // Get binary data
    return template.generate();
};