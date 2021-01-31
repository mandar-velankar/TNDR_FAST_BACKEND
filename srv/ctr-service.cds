namespace com.bayer.SXTENDER.ContractService;

using { com.bayer.SXTENDER.ContractsAppData } from '../db/ContractsAppData';
using { com.bayer.SXTENDER.MasterData } from '../db/./MasterData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/./MasterDataViews';
using { com.bayer.SXTENDER.TransactionalData } from '../db/TransactionalData';
using { com.bayer.SXTENDER.TransactionalDataConversion} from '../db/TransactionalDataConversion';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';

service ContractService @(path: 'ctr') @(requires:['f_tndr_cag_admin','f_tndr_cag_ctr_user']){
//service ContractService @(path: 'ctr') @(requires:['all','ctr_user']){ //previously, before CAP integration

    entity Deliveries as projection on ContractsAppData.Deliveries;
    entity Letters as projection on ContractsAppData.Letters;
    entity Product as projection on MasterData.PT_TMPRDPCK;
    entity PenaltyReasons as projection on MasterData.PT_TMPNLTYRS;
    entity CountryCurrency @readonly as projection on MasterDataViews.CountryCurrency;

    entity Products as select from ContractsAppData.Products {
        *,
        sum(
            OfferPrice *
            case when FocType = 'FOC 1'
                then
                    case when FocAbsPct = 'PCT'
                        then RequestedVolume * (1 - Foc)
                        else RequestedVolume - Foc
                    end
                else RequestedVolume
            end
        ) as OfferValue:Double,
        /*Deliveries: redirected to Deliveries,
        Letters: redirected to Letters,*/
        Product: redirected to Product,
    }group by 
        ID,
        ProductPackId,
        CountryCode,
        Enabled,
        Reference,
        AlternateOffer,
        RequestedVolume,
        UoM,
        Samples,
        DocumentsRequired,
        FirstShipment,
        NoofLots,
        IntervalBetweenShipments,
        PaymentTerms,
        Comment,
        IncoTerms,
        Sorter,
        RegisteredPrice,
        WholesalePrice,
        OfferPrice,
        Foc,
        FocType,
        FocAbsPct,
        NetOfferPrice,
        CommissionRate,
        NetPrice,
        Cogs,
        FocBrandProductId,
        FocBrand,
        FocBrandAbsPct,
        CogsBrand,
        BudgetRate,
        SpotRate,
        createdAt,
        createdBy,
        modifiedAt,
        modifiedBy,
        Contract;

    entity Contracts as select from ContractsAppData.Contracts{
        *,
        null as OfferValue: Double,
        Products: redirected to Products
    };


    entity TenderDistributor as projection on MasterData.PT_TMDIST;

    //TenderDeliveries
    entity TenderDeliveries as projection on TransactionalDataConversion.PT_TMDLVTR;
    entity PT_TMDLVTR as projection on TransactionalData.PT_TMDLVTR; //we need this for saving TODO make 1 saving 

    //TenderLetters
    entity TenderLetters as projection on TransactionalDataConversion.PT_TMUDLTRS;
    entity PT_TMUDLTRS as projection on TransactionalData.PT_TMUDLTRS; //we need this for saving TODO make 1 saving 

    entity CountryLegalentity as projection on MasterData.PT_TMCTLE;
    entity CountryProductPack as projection on MasterData.PT_TMCTPRDPCK;
    entity UserCountry as projection on AdminData.PT_TMUSERCTRY;

	entity TenderCountriesUser @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	]) as projection on MasterData.PT_TMCTRY{
		*,
		LegalEntities: redirected to CountryLegalentity,
		CountryPacks: redirected to CountryProductPack,
		User: redirected to UserCountry
	};
    entity TenderSellingCompany as projection on MasterData.PT_TMLE;

    entity TenderChildren as projection on MasterData.PT_TMINSHIER;

    entity TenderInstitute as projection on MasterData.PT_TMINST{
        *,
        Children: redirected to TenderChildren
    }

    entity TenderPrice as projection on TransactionalData.PT_TMBDPR;
    entity TenderGroupPurchasing as projection on TransactionalData.PT_OFGRPUR;
    entity TenderResults as projection on TransactionalData.PT_TMTRRES;
    
    entity TenderProducts as projection on TransactionalDataConversion.PT_TMOFPR {
        *,
        SORTER as Sorter,
        SampleQuantity as Samples,
        UnitPerPack as UoM,
        INCOTerms as IncoTerms,
        SKU as Product,
        Results: redirected to TenderResults,
        Deliveries: redirected to TenderDeliveries,
        Letters: redirected to TenderLetters,
        Price: redirected to TenderPrice,
        GroupPurchasing: redirected to TenderGroupPurchasing,
        Price.RegPrice as RegisteredPrice,
        Price.OfferPrice as OfferPrice,
        Price.FOC as Foc,
        Price.FOCType as FocType,
        Price.FOC_ABS_PCT as FocAbsPct,
        Price.NetofferPrice as NetOfferPrice,
        Price.Deductions as CommissionRate
    }excluding{INCOTerms, SampleQuantity, SORTER};

    entity TenderContracts as projection on TransactionalDataConversion.PT_TMOFRS { //ContractsAppData.TenderContracts {
        *,
        Products: redirected to TenderProducts,
        Distributor: redirected to TenderDistributor,
        SellingCompany: redirected to TenderSellingCompany,
        Institute: redirected to TenderInstitute //TODO: fix this ASAP - split app
    };

}