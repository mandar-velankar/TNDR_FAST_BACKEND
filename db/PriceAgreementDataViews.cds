namespace com.bayer.SXTENDER.PriceAgreementDataViews;

using {com.bayer.SXTENDER.PriceAgreementData} from './PriceAgreementData';


entity PriceAgreementExpiryDate as select from PriceAgreementData.PriceAgreements as PriceAgreements {

key PriceAgreements.TenderId,
max(PriceAgreements.ExpiryDate) as ExpiryDate:DateTime


}

group by PriceAgreements.TenderId, PriceAgreements.ExpiryDate;

