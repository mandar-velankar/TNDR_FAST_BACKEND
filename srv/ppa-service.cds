using { com.bayer.SXTENDER.PricingPolicyData } from '../db/PricingPolicyData';
using { com.bayer.SXTENDER.AdminData } from '../db/AdminData';
using { com.bayer.SXTENDER.MasterDataViews } from '../db/./MasterDataViews';
using { com.bayer.SXTENDER.MasterData } from '../db/MasterData';


service PolicyService @(path: 'ppa') @(requires:['f_tndr_cag_admin','f_tndr_cag_ppa_user']){
    
    //Brands
    entity Brands as projection on PricingPolicyData.Brands;

    entity BrandPolicies as projection on PricingPolicyData.BrandPolicies;

    //Products
    entity Products as select from PricingPolicyData.BrandProducts as BrandProduct 
    left outer join PricingPolicyData.ProductPolicies as Policy on 
        BrandProduct.ProductPackId = Policy.ProductPackId and 
        BrandProduct.CountryCode = Policy.CountryCode and 
        BrandProduct.Division = Policy.Division and 
        BrandProduct.BrandId  = Policy.BrandId {
            key BrandProduct.BrandId,
            key BrandProduct.CountryCode, 
            key BrandProduct.Division,
            key BrandProduct.ProductPackId,
            Policy.ID as PolicyId,
            BrandProduct.ProductName, 
            BrandProduct.ListPrice,
            BrandProduct.Currency,
            case 
                when Policy.MspStatus is null then 'No Policy yet' 
                else Policy.MspStatus 
            end as MspStatus : String(100),
            case 
                when Policy.NspStatus is null then 'No Policy yet' 
                else Policy.NspStatus
            end as NspStatus : String(100),
    }order by BrandProduct.ProductName;

    //Policies & Policy prices linked
    entity Policies as projection on PricingPolicyData.ProductPolicies;

    //Approvals for policies
    entity Approvals as projection on PricingPolicyData.Approvals;

    entity Country as projection on MasterData.PT_TMCTRY;
    entity Users as projection on AdminData.PT_TMUSER;
    
    //Countries where user has accesss to
    entity UserCountry @(restrict: [
		{grant: '*', to: 'authenticated-user', where: 'User.CWID = $user.id'}
	])as projection on AdminData.PT_TMUSERCTRY {
        *,
        Country: redirected to Country,
        User: redirected to Users,
    };

    //divisions distinct 
    entity Divisions as projection on MasterDataViews.Divisions;

    
}