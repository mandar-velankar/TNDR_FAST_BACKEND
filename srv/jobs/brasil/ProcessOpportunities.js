const cds = require('@sap/cds');
const BaseJob = require('../BaseJob');

module.exports = class processOpportunities extends BaseJob {

    constructor(jobName, jobTime) {
        super(jobName, jobTime);
        this.jobName = jobName.toUpperCase();
    }

 /**
    * Triggered when job has started
    */
    //override
    async onTick() {
        console.log(`JOB (${this.jobName }): Processing Ibiz Opportunities ...`);
        const start = new Date().getTime();
        try {
            this.db = await cds.connect.to('db');
            const tx = this.db.tx();

            // Fetch data
            const opportunities = await this.getOpportunities(tx);

            const directIbizOpportunities = opportunities.filter(direct => direct.NU_DIRETO_INDIRETO === 0);
            const directIbizOpportunityParentIDs = directIbizOpportunities.map(dop => dop.ID);
            const directIbizOpportunityItems = await this.getOpportunitiesItems(tx, directIbizOpportunityParentIDs);
            const directIbizOpportunityDocs = await this.getOpportunitiesDocs(tx, directIbizOpportunityParentIDs); //to-be implemented later

            const indirectIbizOpportunities = opportunities.filter(indirect => indirect.NU_DIRETO_INDIRETO === 1);
            const indirectIbizOpportunityParentIDs = indirectIbizOpportunities.map(dop => dop.ID);
            const indirectIbizOpportunityItems = await this.getOpportunitiesItems(tx, indirectIbizOpportunityParentIDs);
            const indirectIbizOpportunityDocs = await this.getOpportunitiesDocs(tx, indirectIbizOpportunityParentIDs); //to-be implemented later

            // Process data
            await this.processDirectIbizOpportunities(tx, directIbizOpportunities, directIbizOpportunityItems);
            await this.processIndirectIbizOpportunities(tx, indirectIbizOpportunities, indirectIbizOpportunityItems);

            // Commit All
            await tx.commit();
            console.log(`JOB (${this.jobName }): Processing Ibiz Opportunities successfully completed.`);
            const end = new Date().getTime();
            const time = end - start;
            console.log(`JOB (${this.jobName }): SUCCESS --> Execution time: ${time} ms`);

        } catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Processing of Ibiz Opportunities failed.`);
            console.error(error);
            await tx.rollback();
            throw error;
        }
    }

      /**
     * This method fetches all the Ibiz opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS
     * @returns - A list of direct and indirect Ibiz opportunities
     */
       async getOpportunities(tx) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS ...`);
            const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizQps));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Opportunities from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS failed`);
            console.error(error);
            throw error;
        }
    }

    /**
     * This method fetches all the Ibiz opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS
     * @returns - A list of Ibiz opportunity items
     */
     async getOpportunitiesItems(tx, parentIDs) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS ...`);
            const { IbizCcsQpsItems } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizCcsQpsItems).where({'parent_ID': { in: parentIDs }}));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Opportunity items from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZCCSQPSITEMS failed`);
            console.error(error);
            throw error;
        }
    }

     /**
     * This method fetches all the Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZDOCS
     * @returns - A list of Ibiz Documents
     */
      async getOpportunitiesDocs(tx, parentIDs) {
        try {
            console.log(`JOB (${this.jobName }): Fetching Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs ...`);
            const { IbizDocs } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
            const result = await tx.run(SELECT.from(IbizDocs).where({'Qps_ID':{"!=": null}, 'parent_ID': { in: parentIDs }}));
            return result;
        }catch (error) {
            console.error(`JOB (${this.jobName }): ERROR - Fetching of Ibiz Documents from COM_BAYER_SXTENDER_MASTERDATA_SAP_IbizDocs failed`);
            console.error(error);
            throw error;
        }
    }

/**
     * This method will process a list of Ibiz Opportunities by Creating/Updating the following entities
     *  - PT_TMTEND
     *  - PT_TMOFRS
     *  - PT_TMOFPR
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS records will be deleted.
     * @param {[Object]} opportunities 
     */
 async processDirectIbizOpportunities(tx, directIbizOpportunities, directIbizOpportunityItems) {
    console.log(`JOB (${this.jobName }): Processing Direct Ibiz Opportunities ...`);
    try {

        // Process data to FAST
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(directIbizOpportunities);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(directIbizOpportunities);
        const mappedProducts = this.mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, directIbizOpportunityItems);

        // 5. Delete all records from IbizQPS after successful processing.
        const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        await tx.run(DELETE.from(IbizQps));

        console.log(`JOB (${this.jobName }): Processing of Direct ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Direct ibiz opportunities failed.`);
        console.error(error);
        throw error;
    }
}

/**
     * This method will process a list of Ibiz Opportunities by Creating/Updating the following entities
     *  - PT_TMTEND
     *  - PT_TMOFRS
     *  - PT_TMOFPR
     *  - PT_TMBDPR
     *  - PRICECONDITION
     * After successful processing, the COM_BAYER_SXTENDER_MASTERDATA_SAP_IBIZQPS records will be deleted.
     * @param {[Object]} opportunities 
     */
 async processIndirectIbizOpportunities(tx, indirectIbizOpportunities, indirectIbizOpportunityItems) {
    console.log(`JOB (${this.jobName }): Processing Indirect ibiz Opportunities ...`);
    try {

        //Process data to FAST
        const mappedTenders = this.mapIbizOpportunitiestoFASTTender(indirectIbizOpportunities);
        const mappedOffers = this.mapIbizOpportunitiestoFASTOffer(indirectIbizOpportunities);
        const mappedProduct = this.mapIbizOpportunitiestoFASTProduct(indirectIbizOpportunities, indirectIbizOpportunityItems);
        const mappedPrice = this.mapIbizOpportunitiestoFASTPrices(indirectIbizOpportunityItems);
        const mappedPriceCondition = this.mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems);

        // 5. Delete all records from BrazilMaterials after successful processing.
        const { IbizQps } = this.db.entities("com.bayer.SXTENDER.MasterData.SAP");
        await tx.run(DELETE.from(IbizQps));

        console.log(`JOB (${this.jobName }): Processing of Indirect ibiz opportunities successfully completed.`);

    }catch (error) {
        console.error(`JOB (${this.jobName }): ERROR - Processing of Indirect ibiz opportunities failed.`);
        console.error(error);
        throw error;
    }
}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMTEND
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} tenders
     */
mapIbizOpportunitiestoFASTTender(directIbizOpportunities) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMTEND ...`);
    directIbizOpportunities = directIbizOpportunities.reduce((prev, curr, idx, directIbizOpportunities) => {
        prev.push(
            {
                TenderID             : "", //need to check with Artiom for logic
                CountryCode          : "BR",
                ToolID               : null,
                TenderNo             : "", //need to check with Artiom for logic
                CloneTenderID        : null,
                SubmittedOn          : Date.now(), //need to check with Artiom for logic
                SubmittedBy          : "anonymous",
                Active               : 1,
                Classification       : "Tender",
                BiddingTypeLevel1    : null,
                BiddingTypeLevel2    : null,
                BiddingTypeLevel3    : null,
                HighValue            : "FALSE",
                OfferStartDate       : null,
                IbizID               : curr.ID_LIC,
                PublicNotice         : null,
                TenderName           : curr.NU_LICITACAO_EDITAL,
                InstituteID          : curr.COD_LICITADOR,
                TenderChannel        : null,
                GroupPurchasing      : null,
                PublicationDate      : curr.DT_ABERTURA,
                BidDueDate           : curr.DT_FIM_ACOLHIMENTO,
                AwardDate            : null,
                NextPublicationDye   : null,
                ContractLength       : null,
                ContractExtenseion   : null,
                TenderStatus         : "Open",
                ManualSaveStatus     : null,
                FoldersCreated       : 0,
                TENDER_TYPE_ID       : curr.NM_MODALIDADE,
                CONTRACT_TYPE_ID     : 1,
                SALES_TYPE_ID        : 1,
                TENDER_ORIGIN_ID     : 1,
                PROCUREMENT_METHOD_ID: "Not Specified",
                PROCUREMENT_REASON   : null,
                CONTENT              : null,
                PORTAL               : null,
                TENDER_TYPE_2_ID     : null,
                SAPID                : null,
                ExternalID           : curr.ID_LIC,
                AlternativeID        : curr.ID_ALTERNATIVO,
                IbizLicitaID         : curr.ID_LICITACAO_IBIZ_LICITA,
                Liciedital           : curr.NU_LICITACAO_EDITAL,
                Purpose              : curr.NM_FINALIDADE_LIC,
                ParticiationType     : curr.NM_LIC_TIPO_PARTICIPACAO,
                ParticipationIntention : curr.NM_CARD_ATUAL
            }
        );
        return prev;
    }, []);
    return directIbizOpportunities;
}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMOFRS
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} offers
     */
mapIbizOpportunitiestoFASTOffer(directIbizOpportunities) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFRS ...`);
    directIbizOpportunities = directIbizOpportunities.reduce((prev, curr, idx, directIbizOpportunities) => {
        prev.push(
            {
                TenderID              : "", //need to check with Artiom for logic
                OfferID               : "", //need to check with Artiom for logic
                CountryCode           : "BR",
                TenderOfferNo         : "", //need to check with Artiom for logic
                RevisedOfferNo        : "", //need to check with Artiom for logic
                ActiveOffer           : 1, 
                CloneOfferID          : null,
                CreationDate          : Date.now(),
                SubmissionDate        : Date.now(),
                SubmittedOn           : Date.now(),
                SubmittedBy           : "anonymous",
                Active                : 1,
                DistributorID         : "", //need to check with Artiom for logic
                InternalBidDueDate    : curr.DT_FIM_ACOLHIMENTO,
                SellingCompany        : "BBR",
                ProductCount          : 0,
                Currency              : "BRL",
                ManualSaveStatus      : null,
                WholesaleOffer        : "No",
                Comment               : null,
                OfferRevisionSplitNo  : null,
                NewOfferDueDate       : curr.DT_FIM_ACOLHIMENTO,
                ContinuationOfferNo   : 0,
                APPROVALS_SENT        : 0,
                FOCType               : null,
                DEFAULT_FOC_ABS_PCT   : null,
                Division              : curr.NM_BU_ABREV,
                ProfitabilityStartMnth: null,
                ProfitabilityAgrDur   : null,
                ProfitabilityYrlyMntCost: null,
                ProfitabilityDiscRate : null,
                ProfitabilityGrowthRate: null,
                IbizWorkflowID         : curr.ID_QP,
                PreviousIbizWorkflowID : curr.ID_PRE_QP,
                TenderDistributorID    : curr.ID_LIC_ATRIBUIDA,
                BusinessUnit           : curr.NM_BU_ABREV,
                Responded              : curr.NU_2D_NOTIF_APPLIED_NO_DN_RESPONDED,
                DistributorDeadline    : curr.DT_FINALIZADO,
                DistributorComments    : curr.NM_MOTIVO_FINALIZADO
            }
        );
        return prev;
    }, []);
    return directIbizOpportunities;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMOFPR
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} products
     */
mapIbizOpportunitiestoFASTProduct(directIbizOpportunities, directIbizOpportunityItems) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMOFPR ...`);
    directIbizOpportunityItems = directIbizOpportunityItems.reduce((prev, curr, idx, directIbizOpportunityItems) => {
        prev.push(
            {
                TenderID                 : "", //need to check with Artiom for logic
                OfferID                  : "", //need to check with Artiom for logic
                CountryCode              : "BR",
                SubmittedOn              : Date.now(), //need to check with Artiom for logic
                SubmittedBy              : "anonymous",
                Active                   : 1,
                ProductCode              : curr.COD_REFERENCIA,
                Reference                : null,
                AlternateOfferYN         : null,
                RequestedVolume          : curr.NU_QTDE_UNITARIA,
                UnitPerPack              : "Unit",
                SampleYN                 : null,
                SampleQuantity           : null,
                DocumentsRequired        : null,
                FirstShipment            : null,
                NoofLots                 : 0,
                IntervalBetweenShipments : 0,
                NoOfTier                 : 0,
                DiscOrOffer              : null,
                PaymentTerms             : null,
                DistributorID            : "", //need to check with Artiom for logic for how to get data from directIbizOpportunities
                SNo                      : null,
                ActiveProduct            : "", //need to check with Artiom for logic
                Comment                  : null,
                INCOTerms                : null,
                SORTER                   : "", //need to check with Artiom for logic
                DEFAULT_COMMISSION_RATE  : 0,
                SUPPLY_UPDATE            : null,
                PAYMENT_UPDATE           : null,
                Line                     : curr.NU_ITEM,
                DeliveryConditions       : null,
                MinInvoiceAmount         : 0,
                PricingPolicyCluster     : null,
                OfferType                : "Selling",
                AnticipatedRequestedQuantity: null,
                MaxPrice                 : null,
                Channel                  : (curr.NU_DIRETO_INDIRETO === 0) ? 'Bayer' : 'Distributor', //need to check with Artiom for logic to get data from directIbizOpportunities
                LotID                    : curr.NU_LOTE,
                WorkflowProductID        : curr.ID_CC_QP,
                IbizWorkflowID           : curr.ID_QP
            }
        );
        return prev;
    }, []);
    return directIbizOpportunityItems;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PT_TMBDPR
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} prices
     */
 mapIbizOpportunitiestoFASTPrices(indirectIbizOpportunityItems) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PT_TMBDPR ...`);
    indirectIbizOpportunityItems = indirectIbizOpportunityItems.reduce((prev, curr, idx, indirectIbizOpportunityItems) => {
        prev.push(
            {
                TenderID              : "", //need to check with Artiom for logic
                OfferID               : "", //need to check with Artiom for logic
                CountryCode           : "BR",
                ProductCode           : curr.COD_REFERENCIA,
                SubmittedOn           : Date.now(),
                SubmittedBy           : "anonymous",
                Active                : 1,
                Tier                  : 1,
                VolumeFrom            : 0,
                VolumeTo              : ,
                RegPrice              : curr.VLR_BASE_CALCULO_UNITARIO,
                FOC                   : null,
                FOCStep               : null, 
                FOCType               : null,
                Discount              : curr.NU_PORCENTAGEM_DESCONTO,
                OfferPrice            : curr.VLR_UNITARIO,
                Deductions            : 0,
                StandardDiscount      : curr.NU_PORCENTAGEM_DESCONTO_INICIAL,
                AdditionalDiscount    : curr.NU_PORCENTAGEM_DESCONTO_ADD,
                NetofferPrice         : null,
                BusinessCasePrice     : null,
                WholesalePrice        : null,
                COGS                  : "", //need to check logic with Artiom
                SpotRate              : 1,
                BudgetRate            : 1,
                Scenario              : 0,
                FOC_ABS_PCT           : null,
                FOC_Bundled_1         : null,
                FOC_ABS_PCT_Bundled_1 : null,
                FOCProduct_Bundled_1  : null,
                ActiveTier            : 0,
                NetPrice              : null,
                NetPrice_OfPaid       : 0,
                PRICE_UPDATE          : "", //Please check the existing logic with Artiom
                LotID                 : curr.NU_LOTE
            }
        );
        return prev;
    }, []);
    return indirectIbizOpportunityItems;

}

/**
     * Maps Ibiz Opportunities fields from Ibiz Opportunities to FAST PriceCondition
     * @param {[Objects]} ibizOpportunities 
     * @returns {[Objects]} priceCondition
     */
 mapIbizOpportunitiestoFASTPriceCondition(indirectIbizOpportunityItems) {

    console.log(`JOB (${this.jobName }): Mapping IBIZ Opportunities to PriceCondition ...`);
    indirectIbizOpportunityItems = indirectIbizOpportunityItems.reduce((prev, curr, idx, indirectIbizOpportunityItems) => {
        prev.push(
            {
                CountryCode                         : "BR",
                OfferID                             : "", //Please check the existing logic with Artiom
                ProductCode                         : curr.COD_REFERENCIA,
                PVL                                 : null,
                ConfidentialPrice                   : null,
                Discount                            : curr.NU_PORCENTAGEM_DESCONTO,
                RoyalDecree                         : null,
                RoyalDecreeValue                    : null,
                RoyalDecreeIncl                     : null,
                StandardDiscount                    : curr.NU_PORCENTAGEM_DESCONTO_INICIAL,
                AdditionalDiscount                  : curr.NU_PORCENTAGEM_DESCONTO_ADD,
                NetPriceWithoutTaxBeforeDeductionRD : null,
                NetPriceWithoutTaxAfterDeductionRD  : null,
                NetPriceWithTaxAfterDeductionRD     : null,
                NetPriceWithoutTax                  : null,
                NetPriceWithTax                     : null,
                MaximumPrice                        : null,
                Tax                                 : null,
                Liquidation                         : null,
                RefundDate                          : null,
                PriceConditionCode                  : null,
                MonthlyRentPerUnit                  : null,
                AnnualValue                         : null,
                ReferencePriceAgreement             : null, 
                LotID                               : curr.NU_LOTE,
                PriceList                           : curr.VLR_BASE_CALCULO_UNITARIO,
                ICMSTax                             : curr.NU_PORCENTAGEM_ICMS,
                TaxExemption                        : (!curr.NU_PORCENTAGEM_ICMS) ? 'No' : 'Yes',
                PriceAfterTaxExemtion               : (!curr.NU_PORCENTAGEM_ICMS) ? null : (curr.VLR_BASE_CALCULO_UNITARIO * (1 - curr.NU_PORCENTAGEM_ICMS)),
                CAP                                 : (curr.NU_CAP === 0) ? false : true,
                PriceAfterCap                       : (curr.NU_CAP === 1) ? ((1 - curr.NU_PORCENTAGEM_CAP) * (1 - curr.NU_PORCENTAGEM_ICMS) * VLR_BASE_CALCULO_UNITARIO) : (1 * (1 - curr.NU_PORCENTAGEM_ICMS) * VLR_BASE_CALCULO_UNITARIO) ,
                CommercialProposal                  : curr.VLR_UNITARIO,
                TaxEqualization                     : null, 
                Invoive                             : null, 
                ICMS                                : null, 
                NetPrice                            : null 
            }
        );
        return prev;
    }, []);
    return indirectIbizOpportunityItems;

}

};