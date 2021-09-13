namespace com.bayer.SXTENDER.MasterData.SAP;

using { User, Country, managed, cuid } from '@sap/cds/common';
using { 
	E1KNA1M, E1KNA11, E1KNB1M, E1MARAM, E1MARA1, E1MAKTM, E1MARCM, E1MARDM, E1MARMM,E1MBEWM, E1MVKEM, E1MLANM, E1MTXHM, E1MTXLM, E1KNVVM, E1KNVKM, E1KNKKM
} from './SAPTypes';


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


entity ItalyMaterials: cuid, managed {
	MATNR  				: String(18);			// Material Number
	HLEVEL1_NAME    	: String(40);			// Description
	HLEVEL4_CODE    	: String(10);			// Version Number Component
	HLEVEL4_NAME    	: String(40);			// Description
	HLEVEL6_CODE   		: String(18);			// Version Number Component
	HLEVEL6_NAME   		: String(40);			// Description            Distribution channel
	UOM   				: String(3);			// Base Unit of Measure
	COUNTRYOFORIG    	: String(3);			// Country of origin of the material
	COGS    			: Double;				// Standard price
	COGS_UOM    		: String(3);			// Base Unit of Measure
	PRICE_UNIT    		: String(5);			// Price Unit
	MAKTX    			: String(40);			// Material Description
	DIVISION_DESC    	: String(20);			// Division description
	EAN11    			: String(18); 			// EAN number
}

entity ItalyCustomers: managed {
	E1KNA1M				: E1KNA1M;				// Master customer master basic data (KNA1 - SAP table)
	E1KNA11				: E1KNA11;				// Customer Master: Additional General Fields  (KNA1 - SAP table)
	E1KNB1M				: E1KNB1M;				// Master Customer Master Company Code (KNB1- SAP table )
}

entity SpainMaterials: managed {
	E1MARAM				: E1MARAM;				// Master material general data (MARA- SAP table)
    E1MARA1				: E1MARA1;				// Additional Fields for E1MARAM segment  - MARA sap table additional fields
    E1MAKTM				: E1MAKTM;				// Master material short texts (MAKT - SAP table) : material description
    E1MARCM				: E1MARCM;				// Master material C segment (MARC : SAP table) :Plant Data for Material
    E1MARDM				: E1MARDM;				// Master material warehouse/batch segment (MARD : SAP table) -Storage Location Data for Material
    E1MARMM				: E1MARMM;				// Master material units of measure (MARM - SAP table ):Units of Measure for Material
    E1MBEWM				: E1MBEWM;				// Master material material valuation (MBEW : SAP table) :Material Valuation
    E1MVKEM				: E1MVKEM;				// Master material sales data (MVKE : SAP table) Sales Data for Material
    E1MLANM				: E1MLANM;				// Master material tax classification (MLAN : SAP table)
    E1MTXHM				: E1MTXHM;				// Master material long text header
    E1MTXLM				: E1MTXLM;				// Master material long text line item
}

entity SpainCustomers: managed {
	E1KNA1M				: E1KNA1M;			// Master customer master basic data (KNA1 - SAP table)
    E1KNA11				: E1KNA11;			// Customer Master: Additional General Fields  (KNA1 - SAP table)
    E1KNB1M				: E1KNB1M;			// Master Customer Master Company Code (KNB1- SAP table )
}