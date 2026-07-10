module.exports = async (srv) => {
    const ConditionContract = await cds.connect.to('ConditionContract');

    srv.on('READ', 'SpainTenderData', async (req) => {
        return ConditionContract.run(req.query);
    });
};
