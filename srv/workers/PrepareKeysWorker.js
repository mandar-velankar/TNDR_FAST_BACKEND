module.exports = async (data) => {

    let ids = [];
    let offers = [];
    let institutes = [];
    let countrycodes = [];
    let productpacks = [];

    for (const pa of data) {
        if (ids.findIndex(id => id === pa.ID) === -1) ids.push(pa.ID);
        if (institutes.findIndex(instituteId => instituteId === pa.InstituteId) === -1) institutes.push(pa.InstituteId);
        if (offers.findIndex(off => off === pa.OfferId) === -1) offers.push(pa.OfferId);
        if (countrycodes.findIndex(cc => cc === pa.CountryCode) === -1) countrycodes.push(pa.CountryCode);
        if (productpacks.findIndex(ppid => ppid === pa.ProductPackId) === -1) productpacks.push(pa.ProductPackId);
    }

    return {
        ids,
        offers,
        institutes,
        countrycodes,
        productpacks
    }
}