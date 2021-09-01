namespace com.bayer.SXTENDER.MasterData.SAP;

using { User, Country, managed, cuid } from '@sap/cds/common';


entity BrazilMaterials: managed {
	key COD				: String(18);			// SAP product code
	NOME				: String(40);			// Product description
	CENTRO				: String(4);			// Material plant code
	APRES				: String;				// Sales text
	ORG_VENDAS			: String(4);			// Sales Org
	CANAL_DISTR			: String(2);			// Distribution channel
	SECTOR_ATIV			: String(2);			// Division
	NREG				: String(13);			// Register Number
	CBAR				: String(18);			// Barcode (EAN)
	GRUPO				: String(3);			// Material group 3 code
	BLOQ_MATERIAL		: String(2);			// Material Block
	PROCEDENCIA			: String(3);			// Origin country
	ORIGEM				: String(1);			// Material origin
	STATUS				: String(1); 			// Material status - If the material is checked for deletion send B, else send A
}

entity BrazilCustomers: managed {
	key CODIGO			: String(10);			// Customer code in SAP
	REPRES				: String(3);			// Flag if the customer is a sales representative - 'M34' - Distributor
	CANAL_DISTR			: String(2);			// Distribution channel
	SECTOR_ATIV			: String(2);			// Division
	RAZAO				: String(35);			// Customer real name
	FANTASIA			: String(10);			// Customer nickname
	ENDERECO			: String(35);			// Address
	BAIRRO				: String(35);			// Neighborhood 
	CIDADE				: String(35);			// City
	CEP					: String(10);			// Zip code
	TELEFONE			: String(16);			// Phone number
	FAX					: String(31);			// Fax
	CNPJ				: String(16);			// Customer fiscal ID 1
	IE					: String(18);			// Customer fiscal ID 1
	EMAIL				: String(3);			// E-mail
	REGIAO				: String(3);			// Customer federation state
	UF					: String(1);			// Customer federation state
	BLOQ				: String(1);			// Flag if customer is blocked
	GRP_CLIENTE			: String(3);			// Customer group 4
	LISTA_PRC			: String(2);			// Customer price list
	STATUS				: String(1); 			// Customer status - A = Insert / Change, D = Deletion
}

entity BrazilPrices : managed {
	key CODIGO			: String(18);			// Material code
	NOME				: String(40);			// Material description
	ORG_VENDAS			: String(4);			// Sales organization
	SETOR_ATV			: String(2);			// Division
	DATA_INI			: Date;					// Initial validate date
	DATA_FIM			: Date;					// End validate date
	PRC_PADRAO			: Double;				// Material price
	DESC_PADRAO			: Double;				// Material discount
	UNI_PRECO			: String(5);			// Price unit
	UNI_MEDIDA			: String(3);			// Material measure unit
	CLIENTE				: String(10);			// Customer code
	PRC_LISTA			: String(2);			// Price list
	GRP_CLIENTE			: String(3);			// Customer group 4
	REG_ORIGEM			: String(3);			// Plant federation state
	REG_DESTINO			: String(3);			// Customer federation state
}

entity BrazilEmpenho : cuid, managed {
	NOTA_FISCAL			: String(9);			// Legal number
	LICITACAO			: String(10);			// SAP contract number
	EMISSAO				: Date;					// Invoice issue date
	CLIENTE				: String(10);			// Customer code
	ITEM				: String(6);			// Item number in "Nota Fiscal"
	MATERIAL			: String(18);			// Material code
	QTDE				: Integer;				// Invoice quantity
	UNITARIO			: Double;				// Item unit price
	EMPENHO				: String(15);			// PO number in sales order
	PEDIDO				: String(10);			// Sales order number
	TOTAL_UNITARIO		: Double;				// Total item value in "Nota Fiscal"
}


entity ItalyMaterials: managed {
	key MATNR  			: String(18);			// Material Number
	HLEVEL1_NAME    	: String(40);			// Description
	HLEVEL4_CODE    	: String(4);			// Version Number Component
	HLEVEL4_NAME    	: String;				// Description
	HLEVEL6_CODE   		: String(4);			// Version Number Component
	HLEVEL6_NAME   		: String(2);			// Description            Distribution channel
	UOM   				: String(2);			// Base Unit of Measure
	COUNTRYOFORIG    	: String(13);			// Country of origin of the material
	COGS    			: Double;				// Standard price
	COGS_UOM    		: String(3);			// Base Unit of Measure
	PRICE_UNIT    		: String(2);			// Price Unit
	MAKTX    			: String(3);			// Material Description
	DIVISION_DESC    	: String(1);			// Division description
	EAN11    			: String(1); 			// EAN number
}

entity ItalyCustomers: managed {
	MSGFN				: String(10);			// Function
	KUNNR				: String(10);			// Customer Number
	ANRED				: String(10);			// Title
	AUFSD				: String(10);			// Central order block for customer
	BAHNE				: String(10);			// Express train station
	BAHNS				: String(10);			// Train station
	BBBNR				: String(10);			// International location number  (part 1)
	BBSNR				: String(10);			// International location number (Part 2)
	BEGRU				: String(10);			// Authorization Group
	BRSCH				: String(10);			// Industry key
	BUBKZ				: String(10);			// Check digit for the international location number
	DATLT				: String(10);			// Data communication line no.
	FAKSD				: String(10);			// Central billing block for customer
	FISKN				: String(10);			// Account number of the master record with the fiscal address
	KNRZA				: String(10);			// Account number of an alternative payer
	KONZS				: String(10);			// Group key
	KTOKD				: String(10);			// Customer Account Group
	KUKLA				: String(10);			// Customer classification
	LAND1				: String(10);			// Country Key
	LIFNR				: String(10);			// Account Number of Vendor or Creditor
	LIFSD				: String(10);			// Central delivery block for the customer
	LOCCO				: String(10);			// City Coordinates
	LOEVM				: String(10);			// Central Deletion Flag for Master Record
	NAME1				: String(10);			// Name 1
	NAME2				: String(10);			// Name 2
	NAME3				: String(10);			// Name 3
	NAME4				: String(10);			// Name 4
	NIELS				: String(10);			// Nielsen ID
	ORT01				: String(10);			// City
	ORT02				: String(10);			// District
	PFACH				: String(10);			// PO Box
	PSTL2				: String(10);			// P.O. Box Postal Code
	PSTLZ				: String(10);			// Postal Code
	REGIO				: String(10);			// Region (State, Province, County)
	COUNC				: String(10);			// County Code
	CITYC				: String(10);			// City Code
	RPMKR				: String(10);			// Regional Market
	SORTL				: String(10);			// Sort field
	SPERR				: String(10);			// Central posting block
	SPRAS				: String(10);			// Language Key
	STCD1				: String(10);			// Tax Number 1
	STCD2				: String(10);			// Tax Number 2
	STKZA				: String(10);			// Indicator: Business Partner Subject to Equalization Tax?
	STKZU				: String(10);			// Liable for VAT
	STRAS				: String(10);			// House number and street
	TELBX				: String(10);			// Telebox number
	TELF1				: String(10);			// First telephone number
	TELF2				: String(10);			// Second telephone number
	TELFX				: String(10);			// Fax Number
	TELTX				: String(10);			// Teletex number
	TELX1				: String(10);			// Telex number
	LZONE				: String(10);			// Transportation zone to or from which the goods are delivered
	XZEMP				: String(10);			// Indicator: Alternative payee in document allowed ?
	VBUND				: String(10);			// Company ID of trading partner
	STCEG				: String(10);			// VAT Registration Number
	GFORM				: String(10);			// Legal status
	BRAN1				: String(10);			// Industry Code 1
	BRAN2				: String(10);			// Industry code 2
	BRAN3				: String(10);			// Industry code 3
	BRAN4				: String(10);			// Industry code 4
	BRAN5				: String(10);			// Industry code 5
	UMJAH				: String(10);			// Year For Which Sales are Given
	UWAER				: String(10);			// Currency of sales figure
	JMZAH				: String(10);			// Yearly number of employees
	JMJAH				: String(10);			// Year for which the number of employees is given
	KATR1				: String(10);			// Attribute 1
	KATR2				: String(10);			// Attribute 2
	KATR3				: String(10);			// Attribute 3
	KATR4				: String(10);			// Attribute 4
	KATR5				: String(10);			// Attribute 5
	KATR6				: String(10);			// Attribute 6
	KATR7				: String(10);			// Attribute 7
	KATR8				: String(10);			// Attribute 8
	KATR9				: String(10);			// Attribute 9
	KATR10				: String(10);			// Attribute 10
	STKZN				: String(10);			// Natural Person
	UMSA1				: String(10);			// Field of length 16
	TXJCD				: String(10);			// Tax Jurisdiction
	PERIV				: String(10);			// Fiscal Year Variant
	KTOCD				: String(10);			// Reference Account Group for One-Time Account (Customer)
	PFORT				: String(10);			// PO Box city
	DTAMS				: String(10);			// Indicator for Data Medium Exchange
	DTAWS				: String(10);			// Instruction key for data medium exchange
	HZUOR				: String(10);			// Hierarchy assignment (batch input)
	CIVVE				: String(10);			// ID for mainly non-military use
	MILVE				: String(10);			// ID for mainly military use
	SPRAS_ISO			: String(10);			// 2-Character SAP Language Code
	FITYP				: String(10);			// Tax type
	STCDT				: String(10);			// Tax Number Type
	STCD3				: String(10);			// Tax Number 3
	STCD4				: String(10);			// Tax Number 4
	XICMS				: String(10);			// Customer is ICMS-exempt
	XXIPI				: String(10);			// Customer is IPI-exempt
	XSUBT				: String(10);			// Customer group of Substituiçao Tributária calculation- old!!
	CFOPC				: String(10);			// Customer's CFOP category
	TXLW1				: String(10);			// Tax law: ICMS
	TXLW2				: String(10);			// Tax law: IPI
	CCC01				: String(10);			// Indicator for biochemical warfare for legal control
	CCC02				: String(10);			// Indicator for nuclear nonproliferation for legal control
	CCC03				: String(10);			// Indicator for national security for legal control
	CCC04				: String(10);			// Indicator for missile technology for legal control
	CASSD				: String(10);			// Central sales block for customer
	KDKG1				: String(10);			// Customer condition group 1
	KDKG2				: String(10);			// Customer condition group 2
	KDKG3				: String(10);			// Customer condition group 3
	KDKG4				: String(10);			// Customer condition group 4
	KDKG5				: String(10);			// Customer condition group 5
	NODEL				: String(10);			// Central deletion block for master record
	XSUB2				: String(10);			// Customer group for Substituiçao Tributária calculation
	WERKS				: String(10);			// Plant
	KNURL				: String(10);			// Uniform Resource Locator
	J_1KFREPRE			: String(10);			// Name of Representative
	J_1KFTBUS			: String(10);			// Type of Business
	J_1KFTIND			: String(10);			// Type of Industry
	PSOIS				: String(10);			// Subledger acct preprocessing procedure
	PSON1				: String(10);			// Name 1
	PSON2				: String(10);			// Name 1
	PSON3				: String(10);			// Name 1
	PSOVN				: String(10);			// First Name
	PSOTL				: String(10);			// Title
	PSOO1				: String(10);			// Description
	PSOO2				: String(10);			// Description
	PSOO3				: String(10);			// Description
	PSOO4				: String(10);			// Description
	PSOO5				: String(10);			// Description
	STCD5				: String(10);			// Tax Number 5
	SUFRAMA				: String(10);			// Suframa Code
	RG					: String(10);			// RG Number
	EXP					: String(10);			// Issued by
	UF					: String(10);			// State
	RGDATE				: String(10);			// RG Issue Date		
	RIC					: String(10);			// RIC Number		
	RNE					: String(10);			// Foreign National Registration		
	RNEDATE				: String(10);			// RNE Issue Date		
	CNAE				: String(10);			// CNAE		
	LEGALNAT			: String(10);			// Legal Nature		
	CRTN				: String(10);			// CRT Number
	ICMSTAXPAY			: String(10);			// ICMS Taxpayer
	INDTYP				: String(10);			// Industry Main Type
	TDT					: String(10);			// Tax Declaration Type
	COMSIZE				: String(10);			// Company Size
	DECREGPC			: String(10);			// Declaration Regimen for PIS/COFINS
	CVP_XBLCK			: String(10);			// Business Purpose Completed Flag
	BUKRS				: String(10);			// Company Code
	SPERR				: String(10);			// Posting block for company code
	LOEVM				: String(10);			// Deletion Flag for Master Record (Company Code Level)
	ZUAWA				: String(10);			// Key for sorting according to assignment numbers
	BUSAB				: String(10);			// Accounting clerk
	AKONT				: String(10);			// Reconciliation Account in General Ledger
	BEGRU				: String(10);			// Authorization Group
	KNRZE				: String(10);			// Head office account number (in branch accounts)
	KNRZB				: String(10);			// Account number of an alternative payer
	ZAMIM				: String(10);			// Indicator: Payment notice to customer (with cleared items)?
	ZAMIV				: String(10);			// Indicator: payment notice to sales department?
	ZAMIR				: String(10);			// Indicator: payment notice to legal department?
	ZAMIB				: String(10);			// Indicator: Payment notice to the accounting department ?
	ZAMIO				: String(10);			// Indicator: payment notice to customer (w/o cleared items)?
	ZWELS				: String(10);			// List of the Payment Methods to be Considered
	XVERR				: String(10);			// Indicator: Clearing between customer and vendor ?
	ZAHLS				: String(10);			// Block Key for Payment
	ZTERM				: String(10);			// Terms of Payment Key
	WAKON				: String(10);			// Terms of payment key for bill of exchange charges
	VZSKZ				: String(10);			// Interest calculation indicator
	ZINDT				: String(10);			// Key date of the last interest calculation
	ZINRT				: String(10);			// Interest calculation frequency in months
	EIKTO				: String(10);			// Our account number at customer
	ZSABE				: String(10);			// User at customer
	KVERM				: String(10);			// Memo
	FDGRV				: String(10);			// Planning group
	VRBKZ				: String(10);			// Export credit insurance institution number
	VLIBB				: String(10);			// Amount Insured
	VRSZL				: String(10);			// Insurance lead months
	VRSPR				: String(10);			// Deductible percentage rate
	VRSNR				: String(10);			// Insurance number
	VERDT				: String(10);			// Insurance validity date
	PERKZ				: String(10);			// Collective invoice variant
	XDEZV				: String(10);			// Indicator: Local processing?
	XAUSZ				: String(10);			// Indicator for periodic account statements
	WEBTR				: String(10);			// Bill of exchange limit (in local currency)
	REMIT				: String(10);			// Next payee
	DATLZ				: String(10);			// Date of the last interest calculation run
	XZVER				: String(10);			// Indicator: Record Payment History ?
	TOGRU				: String(10);			// Tolerance group for the business partner/G/L account
	KULTG				: String(10);			// Probable time until check is paid
	HBKID				: String(10);			// Short Key for a House Bank
	XPORE				: String(10);			// Indicator: Pay all items separately ?
	BLNKZ				: String(10);			// Subsidy indicator for determining the reduction rates
	ALTKN				: String(10);			// Previous Master Record Number
	ZGRUP				: String(10);			// Key for Payment Grouping
	URLID				: String(10);			// Short Key for Known/Negotiated Leave
	MGRUP				: String(10);			// Key for dunning notice grouping
	LOCKB				: String(10);			// Key of the Lockbox to Which the Customer Is To Pay
	UZAWE				: String(10);			// Payment Method Supplement
	EKVBD				: String(10);			// Account Number of Buying Group
	SREGL				: String(10);			// Selection Rule for Payment Advices
	XEDIP				: String(10);			// Indicator: Send Payment Advices by EDI
	FRGRP				: String(10);			// Release Approval Group
	VRSDG				: String(10);			// Reason Code Conversion Version
	TLFXS				: String(10);			// Accounting clerk's fax number at the customer/vendor
	PERNR				: String(10);			// Personnel Number
	INTAD				: String(10);			// Internet address of partner company clerk
	GUZTE				: String(10);			// Payment Terms Key for Credit Memos
	GRICD				: String(10);			// Activity Code for Gross Income Tax
	GRIDT				: String(10);			// Distribution Type for Employment Tax
	WBRSL				: String(10);			// Value Adjustment Key
	NODEL				: String(10);			// Deletion bock for master record (company code level)
	TLFNS				: String(10);			// Accounting clerk's telephone number at business partner
	CESSION_KZ			: String(10);			// Accounts Receivable Pledging Indicator
	GMVKZD				: String(10);			// Customer is in execution
	AVSND				: String(10);			// Indicator: Send Payment Advice by XML
	SMTP_ADDR			: String(10);			// E-mail Address
	CVP_XBLCK_B			: String(10);			// Business Purpose Completed Flag
}


entity SpainMaterials: managed {
	MSGFN				: String(10);			// Function
	MATNR				: String(10);			// Material Number
	ERSDA				: String(10);			// Created On
	ERNAM				: String(10);			// Name of Person who Created the Object
	LAEDA				: String(10);			// Date of Last Change
	AENAM				: String(10);			// Name of Person Who Changed Object
	PSTAT				: String(10);			// Maintenance status
	LVORM				: String(10);			// Flag Material for Deletion at Client Level
	MTART				: String(10);			// Material Type
	MBRSH				: String(10);			// Industry sector
	MATKL				: String(10);			// Material Group
	BISMT				: String(10);			// Old material number
	MEINS				: String(10);			// Base Unit of Measure
	BSTME				: String(10);			// Purchase Order Unit of Measure
	ZEINR				: String(10);			// Document number (without document management system)
	ZEIAR				: String(10);			// Document type (without Document Management system)
	ZEIVR				: String(10);			// Document version (without Document Management system)
	ZEIFO				: String(10);			// Page format of document (without Document Management system)
	AESZN				: String(10);			// Document change number (without document management system)
	BLATT				: String(10);			// Page number of document (without Document Management system)
	BLANZ				: String(10);			// Number of sheets (without Document Management system)
	FERTH				: String(10);			// Production/inspection memo
	FORMT				: String(10);			// Page Format of Production Memo
	GROES				: String(10);			// Size/dimensions
	WRKST				: String(10);			// Basic material (basic constituent of a material) - obsolete
	NORMT				: String(10);			// Industry Standard Description (such as ANSI or ISO)
	LABOR				: String(10);			// Laboratory/design office
	EKWSL				: String(10);			// Purchasing Value Key
	BRGEW				: String(10);			// Gross Weight
	NTGEW				: String(10);			// Net Weight
	GEWEI				: String(10);			// Weight Unit
	VOLUM				: String(10);			// Volume
	VOLEH				: String(10);			// Volume unit
	BEHVO				: String(10);			// Container requirements
	RAUBE				: String(10);			// Storage conditions
	TEMPB				: String(10);			// Temperature conditions indicator
	TRAGR				: String(10);			// Transportation Group
	STOFF				: String(10);			// Hazardous material number
	SPART				: String(10);			// Division
	KUNNR				: String(10);			// Competitor
	WESCH				: String(10);			// Quantity: Number of GR/GI slips to be printed
	BWVOR				: String(10);			// Procurement rule
	BWSCL				: String(10);			// Source of Supply
	SAISO				: String(10);			// Season Category
	ETIAR				: String(10);			// Label type
	ETIFO				: String(10);			// Label form
	EAN11				: String(10);			// International Article Number (EAN/UPC)
	NUMTP				: String(10);			// Category of International Article Number (EAN)
	LAENG				: String(10);			// Length
	BREIT				: String(10);			// Width
	HOEHE				: String(10);			// Height
	MEABM				: String(10);			// Unit of Dimension for Length/Width/Height
	PRDHA				: String(10);			// Product hierarchy
	CADKZ				: String(10);			// CAD Indicator
	ERGEW				: String(10);			// Allowed packaging weight
	ERGEI				: String(10);			// Weight Unit
	ERVOL				: String(10);			// Allowed packaging volume
	ERVOE				: String(10);			// Volume unit
	GEWTO				: String(10);			// Excess Weight Tolerance for Handling unit
	VOLTO				: String(10);			// Excess Volume Tolerance of the Handling Unit
	VABME				: String(10);			// Variable Purchase Order Unit Active
	KZKFG				: String(10);			// Configurable Material
	XCHPF				: String(10);			// Batch management requirement indicator
	VHART				: String(10);			// Packaging Material Type
	FUELG				: String(10);			// Maximum level (by volume)
	STFAK				: String(10);			// Stacking factor
	MAGRV				: String(10);			// Material Group: Packaging Materials
	BEGRU				: String(10);			// Authorization Group
	QMPUR				: String(10);			// QM in Procurement is Active
	RBNRM				: String(10);			// Catalog Profile
	MHDRZ				: String(10);			// Minimum Remaining Shelf Life
	MHDHB				: String(10);			// Total shelf life
	MHDLP				: String(10);			// Storage percentage
	VPSTA				: String(10);			// Maintenance status of complete material
	EXTWG				: String(10);			// External Material Group
	MSTAE				: String(10);			// Cross-Plant Material Status
	MSTAV				: String(10);			// Cross-distribution-chain material status
	MSTDE				: String(10);			// Date from which the cross-plant material status is valid
	MSTDV				: String(10);			// Date from which the X-distr.-chain material status is valid
	KZUMW				: String(10);			// Environmentally Relevant
	KOSCH				: String(10);			// Product allocation determination procedure
	NRFHG				: String(10);			// Material qualifies for discount in kind
	MFRPN				: String(10);			// Manufacturer Part Number
	MFRNR				: String(10);			// Number of a Manufacturer
	BMATN				: String(10);			// To material number
	MPROF				: String(10);			// Manufacturer Part Profile
	PROFL				: String(10);			// Dangerous Goods Indicator Profile
	IHIVI				: String(10);			// Indicator: Highly Viscous
	ILOOS				: String(10);			// Indicator: In Bulk/Liquid
	KZGVH				: String(10);			// Packaging Material is Closed Packaging
	XGCHP				: String(10);			// Indicator: Approved batch record required
	COMPL				: String(10);			// Material completion level
	KZEFF				: String(10);			// Assign effectivity parameter values/ override change numbers
	RDMHD				: String(10);			// Rounding rule for calculation of SLED
	IPRKZ				: String(10);			// Period Indicator for Shelf Life Expiration Date
	PRZUS				: String(10);			// Indicator: Product composition printed on packaging
	MTPOS_MARA			: String(10);			// General item category group
	GEWTO_NEW			: String(10);			// Excess Weight Tolerance for Handling unit
	VOLTO_NEW			: String(10);			// Excess Volume Tolerance of the Handling Unit
	WRKST_NEW			: String(10);			// Basic Material
	AENNR				: String(10);			// Change Number
	MATFI				: String(10);			// Material Is Locked
	CMREL				: String(10);			// Relevant for Configuration Management
	SATNR				: String(10);			// Cross-Plant Configurable Material
	SLED_BBD			: String(10);			// Expiration Date
	GTIN_VARIANT		: String(10);			// Global Trade Item Number Variant
	GENNR				: String(10);			// Material Number of the Generic Material in Prepack Materials
	SERLV				: String(10);			// Level of Explicitness for Serial Number
	RMATP				: String(10);			// Reference material for materials packed in same way
	GDS_RELEVANT		: String(10);			// Indicator: Global Data Synchronization-Relevant
	MCOND				: String(10);			// Material Condition Management
	RETDELC				: String(10);			// Return Code
	LOGLEV_RETO			: String(10);			// Return to Logistics Level
	NSNID				: String(10);			// NATO Item Identification Number
	WEORA				: String(10);			// Acceptance At Origin
	TOLGR				: String(10);			// Tolerance Group for Catch Weight Management
	TARA				: String(10);			// Checkbox
	TARUM				: String(10);			// Base Unit of Measure
	PACKCODE			: String(10);			// Packaging Code
	DG_PACK_STATUS		: String(10);			// Dangerous Goods Packaging Status
	ANP					: String(10);			// ANP Code
	MATNR_EXTERNAL		: String(10);			// Material Number
	MATNR_VERSION		: String(10);			// Version Number for MATNR Field
	MATNR_GUID			: String(10);			// External GUID for MATNR Field
	BMATN_EXTERNAL		: String(10);			// Long Material Number for Field BMATN
	BMATN_VERSION		: String(10);			// Version Number for Field BMATN
	BMATN_GUID			: String(10);			// External GUID for Field BMATN
	STOFF_EXTERNAL		: String(10);			// Long Material Number for Field STOFF
	STOFF_VERSION		: String(10);			// Version Number for Field STOFF
	STOFF_GUID			: String(10);			// External GUID for Field STOFF
	HUTYP_DFLT			: String(10);			// Standard HU Type
	PILFERABLE			: String(10);			// Pilferable
	WHSTC				: String(10);			// Warehouse Storage Condition
	WHMATGR				: String(10);			// Warehouse Material Group
	HNDLCODE			: String(10);			// Handling Indicator
	HAZMAT				: String(10);			// Relevant for Hazardous Substances
	HUTYP				: String(10);			// Handling Unit Type
	TARE_VAR			: String(10);			// Variable Tare Weight
	MAXC				: String(10);			// Maximum Allowed Capacity of Packaging Material
	MAXC_TOL			: String(10);			// Overcapacity Tolerance of the Handling Unit
	MAXL				: String(10);			// Maximum Packing Length of Packaging Material
	MAXB				: String(10);			// Maximum Packing Width of Packaging Material
	MAXH				: String(10);			// Maximum Packing Height of Packaging Material
	MAXDIM_UOM			: String(10);			// Unit of Measure for Maximum Packing Length/Width/Height
	HERKL				: String(10);			// Country of origin of the material
	MFRGR				: String(10);			// Material freight group
	QQTIME				: String(10);			// Quarantine Period
	QQTIMEUOM			: String(10);			// Time Unit for Quarantine Period
	QGRP				: String(10);			// 	Quality Inspection Group
	SERIAL				: String(10);			// 	Serial Number Profile
	PS_SMARTFORM		: String(10);			// 	Form Name
	CWQPROC				: String(10);			// 	EWM CW: Catch Weight Profile for Entering CW Quantity
	CWQTOLGR			: String(10);			// 	EWM-CW: Catch Weight Tolerance Group for EWM
	ADPROF				: String(10);			// 	Adjustment Profile
	IPMIPPRODUCT		: String(10);			// 	ID for an Intellectual Property (CRM Product)
	MEDIUM				: String(10);			// 	Medium
	COMMODITY			: String(10);			// 	Physical Commodity
	SGT_CSGR			: String(10);			// 	Segmentation Structure
	SGT_COVSA			: String(10);			// 	Segmentation Strategy
	SGT_REL				: String(10);			// 	Segmentation Relevant
	MSGFN				: String(10);			// 	Function
	SPRAS				: String(10);			// 	Language Key
	MAKTX				: String(10);			// 	Material Description (Short Text)
	SPRAS_ISO			: String(10);			// 	2-Character SAP Language Code
	MSGFN				: String(10);			// 	Function
	WERKS				: String(10);			// 	Plant
	PSTAT				: String(10);			// 	Maintenance status
	LVORM				: String(10);			// 	Deletion Indicator
	BWTTY				: String(10);			// Valuation Category
	MAABC				: String(10);			// ABC Indicator
	KZKRI				: String(10);			// Indicator: Critical part
	EKGRP				: String(10);			// Purchasing Group
	AUSME				: String(10);			// Unit of issue
	DISPR				: String(10);			// Material: MRP profile
	DISMM				: String(10);			// MRP Type
	DISPO				: String(10);			// MRP Controller (Materials Planner)
	PLIFZ				: String(10);			// Planned Delivery Time in Days
	WEBAZ				: String(10);			// Goods Receipt Processing Time in Days
	PERKZ				: String(10);			// Period Indicator
	AUSSS				: String(10);			// Assembly scrap in percent
	DISLS				: String(10);			// Lot size (materials planning)
	BESKZ				: String(10);			// Procurement Type
	SOBSL				: String(10);			// Special procurement type
	MINBE				: String(10);			// Reorder Point
	EISBE				: String(10);			// Safety Stock
	BSTMI				: String(10);			// Minimum Lot Size
	BSTMA				: String(10);			// Maximum Lot Size
	BSTFE				: String(10);			// Fixed lot size
	BSTRF				: String(10);			// Rounding value for purchase order quantity
	MABST				: String(10);			// Maximum stock level
	LOSFX				: String(10);			// Ordering costs
	SBDKZ				: String(10);			// Dependent requirements ind. for individual and coll. reqmts
	LAGPR				: String(10);			// Storage costs indicator
	ALTSL				: String(10);			// Method for Selecting Alternative Bills of Material
	KZAUS				: String(10);			// Discontinuation indicator
	AUSDT				: String(10);			// Effective-Out Date
	NFMAT				: String(10);			// Follow-Up Material
	KZBED				: String(10);			// Indicator for Requirements Grouping
	MISKZ				: String(10);			// Mixed MRP indicator
	FHORI				: String(10);			// Scheduling Margin Key for Floats
	PFREI				: String(10);			// Indicator: automatic fixing of planned orders
	FFREI				: String(10);			// Release indicator for production orders
	RGEKZ				: String(10);			// Indicator: Backflush
	FEVOR				: String(10);			// Production Supervisor
	BEARZ				: String(10);			// Processing time
	RUEZT				: String(10);			// Setup and teardown time
	TRANZ				: String(10);			// Interoperation time
	BASMG				: String(10);			// Base quantity
	DZEIT				: String(10);			// In-house production time
	MAXLZ				: String(10);			// Maximum Storage Period
	LZEIH				: String(10);			// Unit for maximum storage period
	KZPRO				: String(10);			// Indicator: withdrawal of stock from production bin
	GPMKZ				: String(10);			// Indicator: Material Included in Rough-Cut Planning
	UEETO				: String(10);			// Overdelivery tolerance limit
	UEETK				: String(10);			// Indicator: Unlimited Overdelivery Allowed
	UNETO				: String(10);			// Underdelivery tolerance limit
	WZEIT				: String(10);			// Total replenishment lead time (in workdays)
	ATPKZ				: String(10);			// Replacement part
	VZUSL				: String(10);			// Surcharge factor for cost in percent
	HERBL				: String(10);			// State of manufacture
	INSMK				: String(10);			// Post to Inspection Stock
	SSQSS				: String(10);			// QA Control Key
	KZDKZ				: String(10);			// Documentation required indicator
	UMLMC				: String(10);			// Stock in Transfer (Plant to Plant)
	LADGR				: String(10);			// Loading Group
	XCHPF				: String(10);			// Batch management requirement indicator
	USEQU				: String(10);			// Quota arrangement usage
	LGRAD				: String(10);			// Service level
	AUFTL				: String(10);			// Splitting Indicator
	PLVAR				: String(10);			// Plan Version
	OTYPE				: String(10);			// Object Type
	OBJID				: String(10);			// Object ID
	MTVFP				: String(10);			// Checking Group for Availability Check
	PERIV				: String(10);			// Fiscal Year Variant
	KZKFK				: String(10);			// Indicator: take correction factors into account
	VRVEZ				: String(10);			// Shipping setup time
	VBAMG				: String(10);			// Base quantity for capacity planning in shipping
	VBEAZ				: String(10);			// Shipping processing time
	LIZYK				: String(10);			// Delivery cycle
	BWSCL				: String(10);			// Source of Supply
	KAUTB				: String(10);			// Indicator: "automatic purchase order allowed"
	KORDB				: String(10);			// Indicator: Source list requirement
	STAWN				: String(10);			// Commodity Code/Import Code Number for Foreign Trade
	HERKL				: String(10);			// Country of origin of the material
	HERKR				: String(10);			// Region of origin of material (non-preferential origin)
	EXPME				: String(10);			// Unit of measure for commodity code (foreign trade)
	MTVER				: String(10);			// Export/import material group
	PRCTR				: String(10);			// Profit Center
	TRAME				: String(10);			// Stock in Transit
	MRPPP				: String(10);			// PPC planning calendar
	SAUFT				: String(10);			// Ind.: Repetitive mfg allowed
	FXHOR				: String(10);			// Planning time fence
	VRMOD				: String(10);			// Consumption mode
	VINT1				: String(10);			// Consumption period: backward
	VINT2				: String(10);			// Consumption period: forward
	STLAL				: String(10);			// Alternative BOM
	STLAN				: String(10);			// BOM Usage
	PLNNR				: String(10);			// Key for Task List Group
	APLAL				: String(10);			// Group Counter
	LOSGR				: String(10);			// Lot Size for Product Costing
	SOBSK				: String(10);			// Special Procurement Type for Costing
	FRTME				: String(10);			// Production unit
	LGPRO				: String(10);			// Issue Storage Location
	DISGR				: String(10);			// MRP Group
	KAUSF				: String(10);			// Component scrap in percent
	QZGTP				: String(10);			// Certificate Type
	TAKZT				: String(10);			// Takt time
	RWPRO				: String(10);			// Range of coverage profile
	COPAM				: String(10);			// Local field name for CO/PA link to SOP
	ABCIN				: String(10);			// Physical inventory indicator for cycle counting
	AWSLS				: String(10);			// Variance Key
	SERNP				: String(10);			// Serial Number Profile
	STDPD				: String(10);			// Configurable material
	SFEPR				: String(10);			// Repetitive manufacturing profile
	XMCNG				: String(10);			// Negative stocks allowed in plant
	QSSYS				: String(10);			// Required QM System for Vendor
	LFRHY				: String(10);			// Planning cycle
	RDPRF				: String(10);			// Rounding Profile
	VRBMT				: String(10);			// Reference material for consumption
	VRBWK				: String(10);			// Reference plant for consumption
	VRBDT				: String(10);			// To date of the material to be copied for consumption
	VRBFK				: String(10);			// Multiplier for reference material for consumption
	AUTRU				: String(10);			// Reset Forecast Model Automatically
	PREFE				: String(10);			// Preference indicator in export/import
	PRENC				: String(10);			// Exemption certificate: Indicator for legal control
	PRENO				: String(10);			// Exemption certificate number for legal control
	PREND				: String(10);			// Exemption certificate: Issue date of exemption certificate
	PRENE				: String(10);			// Indicator: Vendor declaration exists
	PRENG				: String(10);			// Validity date of vendor declaration
	ITARK				: String(10);			// Indicator: Military goods
	PRFRQ				: String(10);			// Character Field With Field Length 7
	KZKUP				: String(10);			// Indicator: Material can be co-product
	STRGR				: String(10);			// Planning strategy group
	LGFSB				: String(10);			// Default storage location for external procurement
	SCHGT				: String(10);			// Indicator: Bulk Material
	CCFIX				: String(10);			// CC indicator is fixed
	EPRIO				: String(10);			// Withdrawal sequence group for stocks
	QMATA				: String(10);			// Material Authorization Group for Activities in QM
	PLNTY				: String(10);			// Task List Type
	MMSTA				: String(10);			// Plant-Specific Material Status
	SFCPF				: String(10);			// Production Scheduling Profile
	SHFLG				: String(10);			// Safety time indicator (with or without safety time)
	SHZET				: String(10);			// Safety time (in workdays)
	MDACH				: String(10);			// Action control: planned order processing
	KZECH				: String(10);			// Determination of batch entry in the production/process order
	MMSTD				: String(10);			// Date from which the plant-specific material status is valid
	MFRGR				: String(10);			// Material freight group
	FVIDK				: String(10);			// Production Version To Be Costed
	INDUS				: String(10);			// Material CFOP category
	MOWNR				: String(10);			// CAP: Number of CAP products list
	MOGRU				: String(10);			// Common Agricultural Policy: CAP products group-Foreign Trade
	CASNR				: String(10);			// CAS number for pharmaceutical products in foreign trade
	GPNUM				: String(10);			// Production statistics: PRODCOM number for foreign trade
	STEUC				: String(10);			// Control code for consumption taxes in foreign trade
	FABKZ				: String(10);			// Indicator: Item Relevant to JIT Delivery Schedules
	MATGR				: String(10);			// Group of Materials for Transition Matrix
	LOGGR				: String(10);			// Logistics handling group for workload calculation
	VSPVB				: String(10);			// Proposed Supply Area in Material Master Record
	DPLFS				: String(10);			// Fair share rule
	DPLPU				: String(10);			// Indicator: push distribution
	DPLHO				: String(10);			// Deployment horizon in days
	MINLS				: String(10);			// Minimum lot size for Supply Demand Match
	MAXLS				: String(10);			// Maximum lot size for Supply Demand Match
	FIXLS				: String(10);			// Fixed lot size for Supply Demand Match
	LTINC				: String(10);			// Lot size increment for  Supply Demand Match
	COMPL				: String(10);			// Material completion level
	CONVT				: String(10);			// Conversion types for production figures
	FPRFM				: String(10);			// Distribution profile of material in plant
	SHPRO				: String(10);			// Period Profile for Safety Time
	FXPRU				: String(10);			// Fixed-Price Co-Product
	KZPSP				: String(10);			// Indicator for cross-project material
	OCMPF				: String(10);			// Profile for OCM PP / PS
	APOKZ				: String(10);			// Indicator: Is material relevant for APO
	AHDIS				: String(10);			// MRP relevancy for dependent requirements
	EISLO				: String(10);			// Minimum Safety Stock
	NCOST				: String(10);			// Do Not Cost
	MEGRU				: String(10);			// Unit of Measure Group
	ROTATION_DATE		: String(10);			// Strategy for Putaway and Stock Removal
	UCHKZ				: String(10);			// Indicator for Original Batch Management
	UCMAT				: String(10);			// Reference Material for Original Batches
	IUID_RELEVANT		: String(10);			// IUID-Relevant
	IUID_TYPE			: String(10);			// Structure Type of UII
	UID_IEA				: String(10);			// External Allocation of UII
	SGT_COVS			: String(10);			// Segmentation Strategy
	SGT_STATC			: String(10);			// Segmentation Status
	SGT_PRCM			: String(10);			// Consumption Priority
	SGT_CHINT			: String(10);			// Discrete Batch Number
	SGT_STK_PRT			: String(10);			// Stock Protection Indicator
	SGT_DEFSC			: String(10);			// Default Stock Segment value
	MSGFN				: String(10);			// Function
	LGORT				: String(10);			// Storage Location
	PSTAT				: String(10);			// Maintenance status
	LVORM				: String(10);			// Flag Material for Deletion at Storage Location Level
	DISKZ				: String(10);			// Storage location MRP indicator
	LSOBS				: String(10);			// Special procurement type
	LMINB				: String(10);			// Reorder point for storage location MRP
	LBSTF				: String(10);			// Replenishment quantity for storage location MRP
	HERKL				: String(10);			// Country of origin of the material
	EXPPG				: String(10);			// Preference indicator (deactivated)
	EXVER				: String(10);			// Export indicator (deactivated)
	LGPBE				: String(10);			// Storage Bin
	PRCTL				: String(10);			// Profit Center
	LWMKB				: String(10);			// Picking area for lean WM
	BSKRF				: String(10);			// Inventory correction factor
	MSGFN				: String(10);			// Function
	MEINH				: String(10);			// Alternative Unit of Measure for Stockkeeping Unit
	UMREZ				: String(10);			// Numerator for Conversion to Base Units of Measure
	UMREN				: String(10);			// Denominator for conversion to base units of measure
	LAENG				: String(10);			// Length
	BREIT				: String(10);			// Width
	HOEHE				: String(10);			// Height
	MEABM				: String(10);			// Unit of Dimension for Length/Width/Height
	VOLUM				: String(10);			// Volume
	VOLEH				: String(10);			// Volume unit
	BRGEW				: String(10);			// Gross Weight
	GEWEI				: String(10);			// Weight Unit
	NEST_FTR			: String(10);			// Remaining Volume after Nesting (in Percentage)
	MAX_STACK			: String(10);			// Maximum Stacking Factor
	CAPAUSE				: String(10);			// Capacity Usage
	MSGFN				: String(10);			// Function
	BWKEY				: String(10);			// Valuation Area
	VPRSV				: String(10);			// Price control indicator
	VERPR				: String(10);			// Moving Average Price/Periodic Unit Price
	STPRS				: String(10);			// Standard price
	PEINH				: String(10);			// Price Unit
	BKLAS				: String(10);			// Valuation Class
	VMVPR				: String(10);			// Price Control Indicator in Previous Period
	VMVER				: String(10);			// Moving Average Price/Periodic Unit Price in Previous Period
	VMSTP				: String(10);			// Standard price in the previous period
	VMPEI				: String(10);			// Price unit of previous period
	VMBKL				: String(10);			// Valuation Class in Previous Period
	VJVPR				: String(10);			// Price Control Indicator in Previous Year
	VJVER				: String(10);			// Moving Average Price/Periodic Unit Price in Previous Year
	VJSTP				: String(10);			// Standard price in previous year
	LFGJA				: String(10);			// Fiscal Year of Current Period
	LFMON				: String(10);			// Current period (posting period)
	ZKPRS				: String(10);			// Future price
	ZKDAT				: String(10);			// Date as of which the price is valid
	BWPRS				: String(10);			// Valuation price based on tax law: level 1
	BWPRH				: String(10);			// Valuation price based on commercial law: level 1
	VJBWS				: String(10);			// Valuation price based on tax law: level 3
	VJBWH				: String(10);			// Valuation price based on commercial law: level 3
	VVJLB				: String(10);			// Total valuated stock in year before last
	VVMLB				: String(10);			// Total valuated stock in period before last
	VVSAL				: String(10);			// Value of total valuated stock in period before last
	ZPLPR				: String(10);			// Future planned price
	ZPLP1				: String(10);			// Future Planned Price 1
	ZPLP2				: String(10);			// Future Planned Price 2
	ZPLP3				: String(10);			// Future Planned Price 3
	ZPLD1				: String(10);			// Date from Which Future Planned Price 1 Is Valid
	ZPLD2				: String(10);			// Date from Which Future Planned Price 2 Is Valid
	ZPLD3				: String(10);			// Date from Which Future Planned Price 3 Is Valid
	BWPH1				: String(10);			// Valuation price based on commercial law: level 2
	BWPS1				: String(10);			// Valuation price based on tax law: level 2
	ABWKZ				: String(10);			// Lowest value: devaluation indicator
	PSTAT				: String(10);			// Maintenance status
	KALN1				: String(10);			// Cost Estimate Number - Product Costing
	KALNR				: String(10);			// Cost Estimate Number for Cost Est. w/o Qty Structure
	VERS1				: String(10);			// Costing Version of Future Standard Cost Estimate
	VERS2				: String(10);			// Costing Version of Current Standard Cost Estimate
	VERS3				: String(10);			// Costing Version of Previous Standard Cost Estimate
	PPRDZ				: String(10);			// Period of Future Standard Cost Estimate
	PPRDL				: String(10);			// Period of Current Standard Cost Estimate
	PPRDV				: String(10);			// Period of Previous Standard Cost Estimate
	PDATZ				: String(10);			// Fiscal Year of Future Standard Cost Estimate
	PDATL				: String(10);			// Fiscal Year of Current Standard Cost Estimate
	PDATV				: String(10);			// Fiscal Year of Previous Standard Cost Estimate
	VPLPR				: String(10);			// Previous planned price
	MLMAA				: String(10);			// Material ledger activated at material level
	MLAST				: String(10);			// Material Price Determination: Control
	VJBKL				: String(10);			// Valuation Class in Previous Year
	VJPEI				: String(10);			// Price unit of previous year
	BWPEI				: String(10);			// Price unit for valuation prices based on tax/commercial law
	MSGFN				: String(10);			// Function
	VKORG				: String(10);			// Sales Organization
	VTWEG				: String(10);			// Distribution Channel
	SKTOF				: String(10);			// Cash discount indicator
	VMSTA				: String(10);			// Distribution-chain-specific material status
	VMSTD				: String(10);			// Date from which distr.-chain-spec. material status is valid
	AUMNG				: String(10);			// Minimum order quantity in base unit of measure
	LFMNG				: String(10);			// Minimum delivery quantity in delivery note processing
	EFMNG				: String(10);			// Minimum make-to-order quantity
	SCMNG				: String(10);			// Delivery unit
	MTPOS				: String(10);			// Item category group from material master
	PRODH				: String(10);			// Product hierarchy
	MSGFN				: String(10);			// Function
	ALAND				: String(10);			// Departure country (country from which the goods are sent)
	TATY1				: String(10);			// Tax category (sales tax, federal sales tax,...)
	TAXM1				: String(10);			// Tax classification material
	MSGFN				: String(10);			// Function
	TDOBJECT			: String(10);			// Texts: Application Object
	TDNAME				: String(10);			// Name
	TDID				: String(10);			// Text ID
	TDSPRAS				: String(10);			// Language Key
	TDTEXTTYPE			: String(10);			// SAPscript: Format of Text
	SPRAS_ISO			: String(10);			// 2-Character SAP Language Code
	MSGFN				: String(10);			// Function
	TDFORMAT			: String(10);			// Tag column
	TDLINE				: String(10);			// Text Line
}

entity SpainCustomers: managed {
	MSGFN				: String(10);			// Function
	KUNNR				: String(10);			// Customer Number
	ANRED				: String(10);			// Title
	AUFSD				: String(10);			// Central order block for customer
	BAHNE				: String(10);			// Express train station
	BAHNS				: String(10);			// Train station
	BBBNR				: String(10);			// International location number  (part 1)
	BBSNR				: String(10);			// International location number (Part 2)
	BEGRU				: String(10);			// Authorization Group
	BRSCH				: String(10);			// Industry key
	BUBKZ				: String(10);			// Check digit for the international location number
	DATLT				: String(10);			// Data communication line no.
	FAKSD				: String(10);			// Central billing block for customer
	FISKN				: String(10);			// Account number of the master record with the fiscal address
	KNRZA				: String(10);			// Account number of an alternative payer
	KONZS				: String(10);			// Group key
	KTOKD				: String(10);			// Customer Account Group
	KUKLA				: String(10);			// Customer classification
	LAND1				: String(10);			// Country Key
	LIFNR				: String(10);			// Account Number of Vendor or Creditor
	LIFSD				: String(10);			// Central delivery block for the customer
	LOCCO				: String(10);			// City Coordinates
	LOEVM				: String(10);			// Central Deletion Flag for Master Record
	NAME1				: String(10);			// Name 1
	NAME2				: String(10);			// Name 2
	NAME3				: String(10);			// Name 3
	NAME4				: String(10);			// Name 4
	NIELS				: String(10);			// Nielsen ID
	ORT01				: String(10);			// City
	ORT02				: String(10);			// District
	PFACH				: String(10);			// PO Box
	PSTL2				: String(10);			// P.O. Box Postal Code
	PSTLZ				: String(10);			// Postal Code
	REGIO				: String(10);			// Region (State, Province, County)
	COUNC				: String(10);			// County Code
	CITYC				: String(10);			// City Code
	RPMKR				: String(10);			// Regional Market
	SORTL				: String(10);			// Sort field
	SPERR				: String(10);			// Central posting block
	SPRAS				: String(10);			// Language Key
	STCD1				: String(10);			// Tax Number 1
	STCD2				: String(10);			// Tax Number 2
	STKZA				: String(10);			// Indicator: Business Partner Subject to Equalization Tax?
	STKZU				: String(10);			// Liable for VAT
	STRAS				: String(10);			// House number and street
	TELBX				: String(10);			// Telebox number
	TELF1				: String(10);			// First telephone number
	TELF2				: String(10);			// Second telephone number
	TELFX				: String(10);			// Fax Number
	TELTX				: String(10);			// Teletex number
	TELX1				: String(10);			// Telex number
	LZONE				: String(10);			// Transportation zone to or from which the goods are delivered
	XZEMP				: String(10);			// Indicator: Alternative payee in document allowed ?
	VBUND				: String(10);			// Company ID of trading partner
	STCEG				: String(10);			// VAT Registration Number
	GFORM				: String(10);			// Legal status
	BRAN1				: String(10);			// Industry Code 1
	BRAN2				: String(10);			// Industry code 2
	BRAN3				: String(10);			// Industry code 3
	BRAN4				: String(10);			// Industry code 4
	BRAN5				: String(10);			// Industry code 5
	UMJAH				: String(10);			// Year For Which Sales are Given
	UWAER				: String(10);			// Currency of sales figure
	JMZAH				: String(10);			// Yearly number of employees
	JMJAH				: String(10);			// Year for which the number of employees is given
	KATR1				: String(10);			// Attribute 1
	KATR2				: String(10);			// Attribute 2
	KATR3				: String(10);			// Attribute 3
	KATR4				: String(10);			// Attribute 4
	KATR5				: String(10);			// Attribute 5
	KATR6				: String(10);			// Attribute 6
	KATR7				: String(10);			// Attribute 7
	KATR8				: String(10);			// Attribute 8
	KATR9				: String(10);			// Attribute 9
	KATR10				: String(10);			// Attribute 10
	STKZN				: String(10);			// Natural Person
	UMSA1				: String(10);			// Field of length 16
	TXJCD				: String(10);			// Tax Jurisdiction
	PERIV				: String(10);			// Fiscal Year Variant
	KTOCD				: String(10);			// Reference Account Group for One-Time Account (Customer)
	PFORT				: String(10);			// PO Box city
	DTAMS				: String(10);			// Indicator for Data Medium Exchange
	DTAWS				: String(10);			// Instruction key for data medium exchange
	HZUOR				: String(10);			// Hierarchy assignment (batch input)
	CIVVE				: String(10);			// ID for mainly non-military use
	MILVE				: String(10);			// ID for mainly military use
	SPRAS_ISO			: String(10);			// 2-Character SAP Language Code
	FITYP				: String(10);			// Tax type
	STCDT				: String(10);			// Tax Number Type
	STCD3				: String(10);			// Tax Number 3
	STCD4				: String(10);			// Tax Number 4
	XICMS				: String(10);			// Customer is ICMS-exempt
	XXIPI				: String(10);			// Customer is IPI-exempt
	XSUBT				: String(10);			// Customer group of Substituiçao Tributária calculation- old!!
	CFOPC				: String(10);			// Customer's CFOP category
	TXLW1				: String(10);			// Tax law: ICMS
	TXLW2				: String(10);			// Tax law: IPI
	CCC01				: String(10);			// Indicator for biochemical warfare for legal control
	CCC02				: String(10);			// Indicator for nuclear nonproliferation for legal control
	CCC03				: String(10);			// Indicator for national security for legal control
	CCC04				: String(10);			// Indicator for missile technology for legal control
	CASSD				: String(10);			// Central sales block for customer
	KDKG1				: String(10);			// Customer condition group 1
	KDKG2				: String(10);			// Customer condition group 2
	KDKG3				: String(10);			// Customer condition group 3
	KDKG4				: String(10);			// Customer condition group 4
	KDKG5				: String(10);			// Customer condition group 5
	NODEL				: String(10);			// Central deletion block for master record
	XSUB2				: String(10);			// Customer group for Substituiçao Tributária calculation
	WERKS				: String(10);			// Plant
	KNURL				: String(10);			// Uniform Resource Locator
	J_1KFREPRE			: String(10);			// Name of Representative
	J_1KFTBUS			: String(10);			// Type of Business
	J_1KFTIND			: String(10);			// Type of Industry
	PSOIS				: String(10);			// Subledger acct preprocessing procedure
	PSON1				: String(10);			// Name 1
	PSON2				: String(10);			// Name 1
	PSON3				: String(10);			// Name 1
	PSOVN				: String(10);			// First Name
	PSOTL				: String(10);			// Title
	PSOO1				: String(10);			// Description
	PSOO2				: String(10);			// Description
	PSOO3				: String(10);			// Description
	PSOVN				: String(10);			// First Name
	PSOTL				: String(10);			// Title
	PSOO1				: String(10);			// Description
	PSOO2				: String(10);			// Description
	PSOO3				: String(10);			// Description
	PSOO4				: String(10);			// Description
	PSOO5				: String(10);			// Description
	STCD5				: String(10);			// Tax Number 5
	SUFRAMA				: String(10);			// Suframa Code
	RG					: String(10);			// RG Number
	EXP					: String(10);			// Issued by
	UF					: String(10);			// State
	RGDATE				: String(10);			// RG Issue Date
	RIC					: String(10);			// RIC Number
	RNE					: String(10);			// Foreign National Registration
	RNEDATE				: String(10);			// RNE Issue Date
	CNAE				: String(10);			// CNAE
	LEGALNAT			: String(10);			// Legal Nature
	CRTN				: String(10);			// CRT Number
	ICMSTAXPAY			: String(10);			// ICMS Taxpayer
	INDTYP				: String(10);			// Industry Main Type
	TDT					: String(10);			// Tax Declaration Type
	COMSIZE				: String(10);			// Company Size
	DECREGPC			: String(10);			// Declaration Regimen for PIS/COFINS
	CVP_XBLCK			: String(10);			// Business Purpose Completed Flag
	MSGFN				: String(10);			// Function
	BUKRS				: String(10);			// Company Code
	SPERR				: String(10);			// Posting block for company code
	LOEVM				: String(10);			// Deletion Flag for Master Record (Company Code Level)
	ZUAWA				: String(10);			// Key for sorting according to assignment numbers
	BUSAB				: String(10);			// Accounting clerk
	AKONT				: String(10);			// Reconciliation Account in General Ledger
	BEGRU				: String(10);			// Authorization Group
	KNRZE				: String(10);			// Head office account number (in branch accounts)
	KNRZB				: String(10);			// Account number of an alternative payer
	ZAMIM				: String(10);			// Indicator: Payment notice to customer (with cleared items)?
	ZAMIV				: String(10);			// Indicator: payment notice to sales department?
	ZAMIR				: String(10);			// Indicator: payment notice to legal department?
	ZAMIB				: String(10);			// Indicator: Payment notice to the accounting department ?
	ZAMIO				: String(10);			// Indicator: payment notice to customer (w/o cleared items)?
	ZWELS				: String(10);			// List of the Payment Methods to be Considered
	XVERR				: String(10);			// Indicator: Clearing between customer and vendor ?
	ZAHLS				: String(10);			// Block Key for Payment
	ZTERM				: String(10);			// Terms of Payment Key
	WAKON				: String(10);			// Terms of payment key for bill of exchange charges
	VZSKZ				: String(10);			// Interest calculation indicator
	ZINDT				: String(10);			// Key date of the last interest calculation
	ZINRT				: String(10);			// Interest calculation frequency in months
	EIKTO				: String(10);			// Our account number at customer
	ZSABE				: String(10);			// User at customer
	KVERM				: String(10);			// Memo
	FDGRV				: String(10);			// Planning group
	VRBKZ				: String(10);			// Export credit insurance institution number
	VLIBB				: String(10);			// Amount Insured
	VRSZL				: String(10);			// Insurance lead months
	VRSPR				: String(10);			// Deductible percentage rate
	VRSNR				: String(10);			// Insurance number
	VERDT				: String(10);			// Insurance validity date
	PERKZ				: String(10);			// Collective invoice variant
	XDEZV				: String(10);			// Indicator: Local processing?
	XAUSZ				: String(10);			// Indicator for periodic account statements
	WEBTR				: String(10);			// Bill of exchange limit (in local currency)
	REMIT				: String(10);			// Next payee
	DATLZ				: String(10);			// Date of the last interest calculation run
	XZVER				: String(10);			// Indicator: Record Payment History ?
	TOGRU				: String(10);			// Tolerance group for the business partner/G/L account
	KULTG				: String(10);			// Probable time until check is paid
	HBKID				: String(10);			// Short Key for a House Bank
	XPORE				: String(10);			// Indicator: Pay all items separately ?
	BLNKZ				: String(10);			// Subsidy indicator for determining the reduction rates
	ALTKN				: String(10);			// Previous Master Record Number
	ZGRUP				: String(10);			// Key for Payment Grouping
	URLID				: String(10);			// Short Key for Known/Negotiated Leave
	MGRUP				: String(10);			// Key for dunning notice grouping
	LOCKB				: String(10);			// Key of the Lockbox to Which the Customer Is To Pay
	UZAWE				: String(10);			// Payment Method Supplement
	EKVBD				: String(10);			// Account Number of Buying Group
	SREGL				: String(10);			// Selection Rule for Payment Advices
	XEDIP				: String(10);			// Indicator: Send Payment Advices by EDI
	FRGRP				: String(10);			// Release Approval Group
	VRSDG				: String(10);			// Reason Code Conversion Version
	TLFXS				: String(10);			// Accounting clerk's fax number at the customer/vendor
	PERNR				: String(10);			// Personnel Number
	INTAD				: String(10);			// Internet address of partner company clerk
	GUZTE				: String(10);			// Payment Terms Key for Credit Memos
	GRICD				: String(10);			// Activity Code for Gross Income Tax
	GRIDT				: String(10);			// Distribution Type for Employment Tax
	WBRSL				: String(10);			// Value Adjustment Key
	NODEL				: String(10);			// Deletion bock for master record (company code level)
	TLFNS				: String(10);			// Accounting clerk's telephone number at business partner
	CESSION_KZ			: String(10);			// Accounts Receivable Pledging Indicator
	GMVKZD				: String(10);			// Customer is in execution
	AVSND				: String(10);			// Indicator: Send Payment Advice by XML
	SMTP_ADDR			: String(10);			// E-mail Address
	CVP_XBLCK_B			: String(10);			// Business Purpose Completed Flag
}