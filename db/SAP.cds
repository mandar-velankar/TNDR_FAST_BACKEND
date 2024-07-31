namespace com.bayer.SXTENDER.MasterData.SAP;

using { Currency, User, Country, managed, cuid } from '@sap/cds/common';
using { 
	E1KNA1M, E1KNA11, E1KNB1M, E1MARAM, E1MARA1, E1MAKTM, E1MARCM, E1MARDM, E1MARMM,E1MBEWM, E1MVKEM, E1MLANM, E1MTXHM, E1MTXLM, E1KNVVM, E1KNVKM, E1KNKKM
} from './SAPTypes';


entity BrazilMaterials: cuid, managed {
	COD					: String(18);			// SAP product code - key
	NOME				: String(40);			// Product description
	CENTRO				: String(4);			// Material plant code
	APRES				: String;				// Sales text
	ORG_VENDAS			: String(4);			// Sales Org
	CANAL_DISTR			: String(2);			// Distribution channel
	SETOR_ATIV			: String(2);			// Division
	NREG				: String(13);			// Register Number
	CBAR				: String(18);			// Barcode (EAN)
	GRUPO_MAT3		    : String(3);			// Material group 3 code
	BLOQ_MATERIAL		: String(2);			// Material Block
	PROCEDENCIA			: String(3);			// Origin country
	ORIGEM				: String(1);			// Material origin
	STATUS				: String(1); 			// Material status - If the material is checked for deletion send B, else send A
	BRAND               : String;               // not in spec? String ok?
}

entity BrazilCustomers: cuid, managed {
	CODIGO			    : String(10);			// Customer code in SAP - key
	REPRES				: String(3);			// Flag if the customer is a Distributor or Institute ( X = Distributor)
	ORG_VENDAS			: String(4);			// Sales organization
    CANAL_DISTR			: String(2);			// Distribution channel
	SETOR_ATIV	        : String(2);		    // Division - key
	RAZAO				: String;			    // Customer real name  (spec mis match, it was 35 long)
	FANTASIA			: String(10);			// Customer nickname
	ENDERECO			: String(35);			// Address
	BAIRRO				: String(35);			// Neighborhood 
	CIDADE				: String(35);			// City
	CEP					: String(10);			// Zip code
	TELEFONE			: String(16);			// Phone number
	FAX					: String(31);			// Fax
	CNPJ				: String(16);			// Customer fiscal ID 1
	IE					: String(18);			// Customer fiscal ID 1
	EMAIL				: String;			    // E-mail (Spec different? this was specified as 3 long??)
	REGIAO				: String(3);			// Customer federation state
	UF					: String(3);			// Customer federation state
	BLOQ				: String(1);			// Flag if customer is blocked
	GRP_CLIENTE			: String(3);			// Customer group 4
	LISTA_PRC			: String(2);			// Customer price list
	COND_PAGTO          : String(4);			// Not in spec? String(4) ok?
	STATUS				: String(1); 			// Customer status - A = Insert / Change, D = Deletion
}

entity BrazilPrices : cuid, managed {
	CODIGO			    : String(18);			// Material code - key
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
    TYPE                : String(4);            // Price List Type
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

entity BrazilTaxes: cuid, managed {
	SHIPFROM			: String;
	SHIPTO				: String;
	TAX_GROUP			: String;
	MATERIAL			: String;
	RATE				: String;
	BASE				: String;
}

entity BrazilDeliveriesHeader: cuid, managed {
	SALES_DOCUMENT			: String(10); 			// Sales Document number
	DISTR_CHAN				: String(2);			// Canal de distribuição
	DIVISION				: String(2);			// Setor de Atividade
	CUSTOMER				: String(10);			// Customer SP
	CUSTOMER_NAME			: String(35);			// Name SP
	STATUS_REJECTION		: String(1);			// Rejection status
	STATUS					: String(1);			// Status
	CREATED_BY				: String(12);			// SO Created by
	SALES_CREATED_ON		: Date;					// Sales order Created on
	TERMS_PAY				: String(4);			// Terms of Payment
	SALES_NET				: Double;				// Sales order header net value
	CURRENCY				: String(5);			// Document Currency
	DELIVERY_DOCUMENT		: String(10);			// Delivery document number
	DELIVERY_CREATED_ON		: Date;					// Delivery created on
	DATE_REQUESTED_HEADER	: Date;					// Requested delivery date
	DATE_GOODS_ISSUE		: Date;					// Goods Issue Date
	NUMBER_BILL				: String(10);			// Number of invoice
	DATE_BILL				: Date;					// Billing date
	NET_BILL				: Double;				// Net value billing document
	ITEMS					: Association to many BrazilDeliveriesItems on ITEMS.HEADER = $self; 
}

entity BrazilDeliveriesItems: cuid, managed {
	SALES_DOCUMENT			: String(10); 			// Sales Document number reference to header
	SALES_ITEM				: Integer;				// Sales Document Item
	SALES_REJECTION			: String(2);			// Reason for rejection
	MATERIAL				: String(18);			// Material
	DESCRPTION				: String(40);			// Description                                       
	PRODUCT_HIERARCHY		: String(18);			// Product hierarchy
	SALES_QUTY				: Double;				// Order Quantity
	QUTY_CONFIRMED			: Double;				// Confirmed Quantity
	ITEM_CATEGORY			: String(4);			// Item category
	UNIT_MEASURE			: String(3);			// Unit of measure
	PRICE_UNIT				: Double;				// Pricing unit
	SALES_NET_PRICE			: Double;				// Sales order item net price
	SALES_NET_VALUE			: Double;				// Sales order item net value
	DELIVERY_QUANTITY		: Integer;				// Delivery quantity
	DATE_DELIVERY			: Date;					// Conf.Delv.Date
	DATE_REQUESTED_POSITION	: Date;					// Requested deliv.date (position)
	QUANT_BILL				: Double;				// Billed Quantity
	HEADER					: Association to BrazilDeliveriesHeader;
}

entity BrazilExemptions: cuid, managed {
	SHIP_TO 			: String(3);			// Ship from location (tax region) - Bayer location
	SHIP_FROM			: String(3);			// Ship to location (tax region)
	GROUPS				: String(2);			// Table TAX Group 
	MATNR				: String(18);			// SAP product Code
	RATE				: String(6);			// Aliquot used for exemption process
	BASE				: String(6);			// Base uses for exemption process
}

entity IbizQps: cuid, managed {
	ID_QP 								: Integer; 		//ID QP (workflow)
	ID_PRE_QP 							: Integer; 		//ID Pre QP (pre-workflow)
	ID_LIC_ATRIBUIDA 					: Integer; 		//ID BID by distributor or direct participation
	ID_LIC 								: Integer; 		//ID BID
	NU_SENT_EXT_LINK 					: Integer; 		//Determine if opportunity has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	NU_DIRETO_INDIRETO 					: Integer; 		//Determine if opportunity is direct or indirect (0 = direct; 1 = indirect)
	ID_ALTERNATIVO 						: String; 		//ID Alternative (used for linking legacy bids)
	ID_LICITACAO_IBIZ_LICITA  			: Integer; 		//ID IBIZ Licita (service of IBIZ that capture bids)
	NM_BU_ABREV 						: String; 		//Business Unit
	DT_PUBLICACAO						: String;		//Publication Date
	DT_CAPTURA 							: String; 		//BID's date of capture
	DT_ABERTURA 						: String; 		//Opening date
	DT_FIM_ACOLHIMENTO 					: String; 		//Closing date
	NM_ALTERA_COTACAO					: String; 		//Comment
	NM_MODALIDADE 						: String; 		//BID's modality
	NU_LICITACAO_EDITAL 				: String; 		//BID's document number
	NM_PROCESSO 						: String; 		//Process number
	COD_LICITADOR 						: String; 		//Main Institute's CNPJ
	NM_LICITADOR 						: String; 		//Main Institute's name
	NM_FANTASIA 						: String; 		//Main Institute's secondary name
	NM_MUNICIPIO 						: String; 		//Main Institute's city
	NM_UF_ABREV 						: String; 		//Main Institute's state
	NM_PAIS 							: String; 		//Main Institute's country
	NM_DONO_QP 							: String; 		//Distributor's name (for direct it will be Bayer's name)
	COD_DONO_QP 						: String; 		//Distributor's CNPJ (for direct it will be Bayer's CNPJ)
	NM_FINALIDADE_LIC 					: String; 		//Item's purpose
	NM_LIC_TIPO_PARTICIPACAO 			: String; 		//Participation's type
	NM_CARD_ATUAL 						: String; 		//Current workflow step
	NU_2D_NOTIF_APPLIED_NO_DN_RESPONDED : Integer; 		//Determine if the opportunity wasn't interesting for any DN and was switched automaticly to direct 2 days before the opening date (0 = no; 1 = yes)
	DT_FINALIZADO 						: String; 		//Determine if a workflow was ended by setting a date its end (if it is null, than the workflow is still on going)
	NM_MOTIVO_FINALIZADO 				: String; 		//Determine the motive for ending a workflow
	CCS_QPS								: Composition of many IbizCcsQpsItems on CCS_QPS.parent = $self;	//List of batch and items by products
	DOCS								: Composition of many IbizDocs on DOCS.Qps = $self;	//List of opportunities documents
}

entity IbizCcsQpsItems: cuid {
	ID_CC_QP  						: Integer; 		//ID QP item
	ID_QP 							: Integer; 		//ID QP (workflow)
	NU_LOTE 						: Integer; 		//Batch number
	NU_ITEM 						: Integer; 		//Item number
	ID_CONTEUDO_CATALOGO 			: Integer; 		//ID product
	COD_REFERENCIA 					: String; 		//SAP code
	NU_QTDE_UNITARIA 				: Integer;  	//Unit quantity
	NU_QTDE_EMBALAGEM 				: Integer;  	//Package quantity
	VLR_BASE_CALCULO_UNITARIO 		: Double;  		//Unit price for distributor -> institute sale (with taxes and without discounts)
	VLR_BASE_CALCULO 				: Double; 		//Package price for distributor -> institute sale (with taxes and without discounts)
	VLR_UNITARIO 					: Double;  		//Unit price for bayer -> distributor sale (with taxes and with discounts)
	VLR_EMBALAGEM 					: Double; 		//Package price for bayer -> distributor sale (with taxes and with discounts)
	NU_TIPO 						: Integer; 		//Item type (0=direct sales; 1=sample FOC; 2=lending; 3=consigned; 4=location; 5=service; 6=testing; 7=bonus FOC)
	NU_UF_ICMS 						: String; 		//State
	NU_PORCENTAGEM_ICMS 			: Double; 		//ICMS Tax
	NU_CAP 							: Integer; 		//Determines if CAP is applied (0=no; 1=yes)
	NU_PORCENTAGEM_CAP 				: Double; 		//CAP discount
	NU_PORCENTAGEM_DESCONTO 		: Double; 		//Total discount
	NU_PORCENTAGEM_DESCONTO_INICIAL : Double; 		//Initial discount
	NU_PORCENTAGEM_DESCONTO_ADD 	: Double; 		//Additional discount
	parent							: Association to IbizQps;
}

entity IbizDocs: cuid {
	ID_DOC 				: Integer; 				//ID Document
	CREATED_AT 			: String;  				//Doc's criation date
	NM_TAG 				: String; 				//Doc's label
	NM_DOC 				: String; 				//File name
	FILE_URL 			: String;  				//Signed file url to be requested as GET (expires in 5 minutes)
	Contratos			: Association to IbizContratos;	
	Qps					: Association to IbizQps;	
	Empenhos			: Association to IbizEmpenhos;	
	Resultados			: Association to IbizResultados;	
}

entity IbizResultados: cuid, managed {
	ID_CC_QP 					: Integer; 		// ID QP Item
	ID_QP 						: Integer; 		// ID QP (workflow)
	ID_RESULTADO				: Integer;
	ID_LIC_ATRIBUIDA			: Integer;
	ID_LIC 						: Integer; 		// ID Lic (BID)
	NU_SENT_EXT_LINK 			: Integer; 		// Determine if result has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	NU_GANHEI 					: Integer; 		// Determine if item was won by distributor (-3 = Did not participate; -2 = No result registered; -1 = Result not published by institute; 0 = Lost; 1 = Won; 2 = There are no winners; 3 = Homologated but without a winner)
	CREATED_AT 					: String; 		// Result's date of creation
	NM_SITUACAO 				: String; 		// Result's situation
	NM_MOTIVO_RESULTADO 		: String; 		// Result's reason
	NM_DESC_MOTIVO_RESULTADO 	: String; 		// Result's reason description
	DT_HOMOLOGACAO 				: String; 		// Result's date of homologation
	POSICOES_RESULTADOS			: Composition of many IbizResultadosItems on POSICOES_RESULTADOS.parent = $self; // List of result items
	DOCS						: Composition of many IbizDocs on DOCS.Resultados = $self;	//List of opportunities documents
}

entity IbizResultadosItems: cuid {
	NU_POSICAO					: Integer;		// Position
	NM_PARTICIPANTE				: String;		// Position's participant
	COD_PARTICIPANTE			: String;		// Position's participant CNPJ
	NM_PRODUTO					: String;		// Position's product
	NM_FABRICANTE				: String;		// Position's product manufacturer
	NU_QTDE						: Integer;		// Position's unit quantity
	VLR_UNITARIO				: Double;		// Position's unit price
	VLR_TOTAL					: Double;		// Position's total price
	parent						: Association to IbizResultados;
}

entity IbizContratos: cuid, managed {
	ID_QP						: Integer;		// 
	ID_QP_CONTRATO				: String;		// 
	ID_CONTRATO					: Integer;		// ID Contract
	ID_LIC_ATRIBUIDA			: Integer;		// ID BID by distributor or direct participation
	ID_LIC						: Integer;		// ID BID
	NU_SENT_EXT_LINK			: Integer;		// Determine if contract has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	NM_COMPRADOR				: String;		// Buyer's name
	COD_COMPRADOR				: String;		// Buyer's CNPJ
	NM_VENDEDOR					: String;		// Seller's name
	COD_VENDEDOR				: String;		// Seller's CNPJ
	NM_PROCESSO					: String;		// Process number
	NU_CONTRATO					: String;		// Contract number
	DT_ASSINATURA				: String;		// Contract's date of signature
	DT_INI_VIGENCIA				: String;		// Contract's date of start
	DT_FIM_VIGENCIA				: String;		// Contract's date of end
	NM_TIPO_CONTRATO			: String;		// Contract's type (ATA/Contrato; Adesao; ATA/Contrato Filho; Aditivo)
	NM_OBS						: String;		// Contract's observation
	CCS_CONTRATOS				: Composition of many IbizContratosItems on CCS_CONTRATOS.parent = $self;		// List of contract items
	DOCS						: Composition of many IbizDocs on DOCS.Contratos = $self;		// List of contracts documents
}

entity IbizContratosItems: cuid {
	ID_CC_CONTRATO				: Integer; 		// ID Contract Item
	ID_CC_QP					: Integer; 		// ID QP Item
	ID_CONTRATO					: Integer; 		// ID Contract
	NU_SENT_EXT_LINK			: Integer; 		// Determine if contract item has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	ID_CONTEUDO_CATALOGO		: Integer; 		// ID product
	COD_REFERENCIA				: String; 		// SAP code
	NU_TIPO						: Integer; 		// Item type (0=direct sales; 1=sample FOC; 2=lending; 3=consigned; 4=location; 5=service; 6=testing; 7=bonus FOC)
	NU_LOTE						: Integer; 		// Batch number
	NU_ITEM						: Integer; 		// Item number
	NU_QTDE_UNITARIA			: Integer; 		// Unit quantity
	NU_QTDE_EMBALAGEM			: Integer; 		// Package quantity
	VLR_UNITARIO				: Double; 		// Unit price for distributor -> institute sale (with taxes and without discounts)
	VLR_EMBALAGEM				: Double; 		// Package price for distributor -> institute sale (with taxes and without discounts)
	parent						: Association to IbizContratos;
}


entity IbizEmpenhos: cuid, managed {
	ID_QP_EMPENHO	 : String;				//ID Opportunity and Commitment	
	ID_EMPENHO 		 : Integer;             //ID Commitment
	ID_CONTRATO 	 : Integer;           	//ID Contract
	ID_QP			 : Integer;				//ID Opportunity
	ID_LIC_ATRIBUIDA : Integer; 			//ID BID by distributor or direct participation
	ID_LIC 			 : Integer; 			//ID BID
	NU_SENT_EXT_LINK : Integer; 			//Determine if opportunity has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	NM_COMPRADOR 	 : String; 				//Buyer's name
	COD_COMPRADOR 	 : String; 				//Buyer's CNPJ
	NM_VENDEDOR 	 : String; 				//Seller's name
	COD_VENDEDOR 	 : String; 				//Seller's CNPJ
	NM_PROCESSO 	 : String; 				//Process number
	NU_EMPENHO 	 	 : String; 				//Commitment number
	DT_EMPENHO 		 : String; 				//Commitment date
	DT_ENTREGA 		 : String; 				//Commitment delivery date
	CREATED_AT 		 : String; 				//Commitment creation date
	CCS_EMPENHOS	 : Composition of many IbizCcsEmpenhosItems on CCS_EMPENHOS.parent = $self;  //List of commiments items
	DOCS			 : Composition of many IbizDocs on DOCS.Empenhos = $self; //List of commiments docuemnts
}

entity IbizCcsEmpenhosItems: cuid {
	ID_CC_QP			: Integer;				//ID QP Item
	ID_CC_EMPENHO 		: Integer; 				//ID Commitment Item
	ID_CC_CONTRATO 		: Integer; 				//ID Contract Item
	ID_EMPENHO 			: Integer; 				//ID Commitment
	NU_SENT_EXT_LINK  	: Integer; 				//Determine if contract has already been sent (-1 = changed; 0 = never approved; 1 = yes)
	COD_REFERENCIA 		: String; 				//SAP code
	NU_QTDE_UNITARIA 	: Integer; 				//Unit quantity
	NU_QTDE_EMBALAGEM 	: Integer; 				//Package quantity
	VLR_UNITARIO 		: Double; 				//Unit price for distributor -> institute sale (with taxes and without discounts)
	VLR_EMBALAGEM 		: Double; 				//Package price for distributor -> institute sale (with taxes and without discounts)
	parent 				: Association to IbizEmpenhos;
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

entity ItalyCustomers: cuid, managed {
	E1KNA1M				: E1KNA1M;				// Master customer master basic data (KNA1 - SAP table)
	E1KNA11				: E1KNA11;				// Customer Master: Additional General Fields  (KNA1 - SAP table)
	E1KNB1M				: E1KNB1M;				// Master Customer Master Company Code (KNB1- SAP table )
	E1KNVVM				: E1KNVVM; 				// Master customer master sales data (KNVV- SAP table)
	E1KNVKM				: E1KNVKM;				// Master customer master contact person (KNVK - SAP table)
	E1KNKKM				: E1KNKKM;				// Master customer master credit mgmt control area data (KNKK - SAP table name)
}

entity ItalyDeliveries: cuid, managed {
	VBELN				: String(10); 			// Delivery
	POSNR				: Integer; 			// Delivery Item
	VKBUR				: String(4); 			// Sales Office
	BUKRS				: String(4); 			// Company Code
	KUNNR				: String(10); 			// Ship-to party
	KUNAG				: String(10);			// Sold-to party
	ERNAM				: String(12); 			// Name of Person who Created the Object
	ERDAT				: DateTime; 			// Date on Which Record Was Created
	XABLN				: String(10); 			// Goods Receipt/Issue Slip Number
	WADAT				: DateTime; 			// Goods Issue Date
	WADAT_IST			: DateTime; 			// Actual Goods Movement Date
	ANZPK				: Double; 				// Total number of packages in delivery
	INCO1				: String(3); 			// Incoterms (Part 1)
	INCO2				: String(28); 			// Incoterms (Part 2)
	VSTEL				: String(4); 			// Shipping Point/Receiving Point
	VSBED				: String(2); 			// Shipping Conditions
	LFART				: String(4); 			// Delivery Type
	MATNR				: String(18); 			// Material Number
	WERKS				: String(4); 			// Plant
	LGORT				: String(4); 			// Storage Location
	CHARG				: String(10); 			// Batch Number
	PSTYV				: String(4); 			// Delivery item category
	LFIMG				: Double; 				// Actual quantity delivered (in sales units)
	VRKME				: String(3); 			// Sales unit
	BWART				: String(3); 			// Movement Type (Inventory Management)
	BRGEW				: Double; 				// Gross weight
	NTGEW				: Double; 			    // Net weight
	GEWEI				: String(3); 			// Weight Unit
	VOLUM				: Double; 				// Volume
	VGBEL				: String(10); 			// Document number of the reference document
	VGPOS				: Integer; 				// Item number of the reference item
	PARTNER_ADDR		: Association to PARTNER_ADDR;		// Delivery Document Partner address
	PLANT_ADDR			: Association to PLANT_ADDR;		// Delivery Document Address of plants
}


// this is the IDOC structure
// entity SpainMaterials: cuid, managed {
// 	E1MARAM				: E1MARAM;				// Master material general data (MARA- SAP table)
//     E1MARA1				: E1MARA1;				// Additional Fields for E1MARAM segment  - MARA sap table additional fields
//     E1MAKTM				: E1MAKTM;				// Master material short texts (MAKT - SAP table) : material description
//     E1MARCM				: E1MARCM;				// Master material C segment (MARC : SAP table) :Plant Data for Material
//     E1MARDM				: E1MARDM;				// Master material warehouse/batch segment (MARD : SAP table) -Storage Location Data for Material
//     E1MARMM				: E1MARMM;				// Master material units of measure (MARM - SAP table ):Units of Measure for Material
//     E1MBEWM				: E1MBEWM;				// Master material material valuation (MBEW : SAP table) :Material Valuation
//     E1MVKEM				: E1MVKEM;				// Master material sales data (MVKE : SAP table) Sales Data for Material
//     E1MLANM				: E1MLANM;				// Master material tax classification (MLAN : SAP table)
//     E1MTXHM				: E1MTXHM;				// Master material long text header
//     E1MTXLM				: E1MTXLM;				// Master material long text line item
// }

entity SpainMaterials: cuid, managed {
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

entity SpainCustomers: cuid, managed {
	E1KNA1M				: E1KNA1M;				// Master customer master basic data (KNA1 - SAP table)
    E1KNA11				: E1KNA11;				// Customer Master: Additional General Fields  (KNA1 - SAP table)
    E1KNB1M				: E1KNB1M;				// Master Customer Master Company Code (KNB1- SAP table )
}


entity SpainDeliveries: cuid, managed {
	VBELN				: String(10); 			// Delivery
	POSNR				: Integer; 			// Delivery Item
	VKBUR				: String(4); 			// Sales Office
	BUKRS				: String(4); 			// Company Code
	KUNNR				: String(10); 			// Ship-to party
	ERNAM				: String(12); 			// Name of Person who Created the Object
	ERDAT				: DateTime; 			// Date on Which Record Was Created
	XABLN				: String(10); 			// Goods Receipt/Issue Slip Number
	WADAT				: DateTime; 			// Goods Issue Date
	WADAT_IST			: DateTime; 			// Actual Goods Movement Date
	ANZPK				: Double; 				// Total number of packages in delivery
	INCO1				: String(3); 			// Incoterms (Part 1)
	INCO2				: String(28); 			// Incoterms (Part 2)
	VSTEL				: String(4); 			// Shipping Point/Receiving Point
	VSBED				: String(2); 			// Shipping Conditions
	LFART				: String(4); 			// Delivery Type
	MATNR				: String(18); 			// Material Number
	WERKS				: String(4); 			// Plant
	LGORT				: String(4); 			// Storage Location
	CHARG				: String(10); 			// Batch Number
	PSTYV				: String(4); 			// Delivery item category
	LFIMG				: Double; 				// Actual quantity delivered (in sales units)
	VRKME				: String(3); 			// Sales unit
	BWART				: String(3); 			// Movement Type (Inventory Management)
	BRGEW				: Double; 				// Gross weight
	NTGEW				: Double; 			    // Net weight
	GEWEI				: String(3); 			// Weight Unit
	VOLUM				: Double; 				// Volume
	VGBEL				: String(10); 			// Document number of the reference document
	VGPOS				: Integer;	 			// Item number of the reference item
	PARTNER_ADDR		: Association to PARTNER_ADDR;		// Delivery Document Partner address
	PLANT_ADDR			: Association to PLANT_ADDR;		// Delivery Document Address of plants
}


entity PARTNER_ADDR : cuid {
	TYPE0				: String(1);			// Single-Character Indicator
	ADRNR				: String(10);			// Address
	NAME1				: String(35);			// Name 1
	NAME2				: String(35);			// Name 2
	STRAS				: String(35);			// House number and street
	HAUSN				: String(6);			// House number
	PSTLZ				: String(10);			// Postal code
	ORT01				: String(35);			// City
	REGIO				: String(3);			// Region (State, Province, County)
	LAND1				: String(3);			// Country Key
	XEGLD				: String(1);			// Indicator: European Union Member?
}

entity PLANT_ADDR : cuid{
	WERKS				: String(4);			// Plant
	NAME1				: String(30);			// Name
	STRAS				: String(30);			// House number and street
	PSTLZ				: String(10);			// Postal Code
	ORT01				: String(25);			// City
	LAND1				: String(3);			// Country Key
	REGIO				: String(3);			// Region (State, Province, County)
}

entity SpainRappel : cuid {
	KNUMA 				: String;	
	BONEM 				: String;	
	DATAB 				: String;				// Effective date
	DATBI 				: String;				// Expiry date
	KNUMH 				: String;				// Customer ID
	SOLD_TO 			: String;	
	MATNR 				: String(18);			// Material number
}