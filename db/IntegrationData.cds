namespace com.bayer.SXTENDER.IntegrationData;

using { User, Country, cuid, managed } from '@sap/cds/common';

// Mercado Publico Tenders
entity MercadoPublicoLicitacione : managed {
    key CodigoExterno                   : String;
        Nombre                          : String;
        CodigoEstado                    : Integer;
        Descripcion                     : String;
        Estado                          : String;
        DiasCierreLicitacion            : String;
        Informada                       : Integer;
        CodigoTipo                      : Integer;
        Tipo                            : String;
        TipoConvocatoria                : String;
        Moneda                          : String;
        Etapas                          : Integer;
        EstadoEtapas                    : String;
        TomaRazon                       : String;
        EstadoPublicidadOfertas         : Integer;
        JustificacionPublicidad         : String;
        Contrato                        : String;
        Obras                           : String;
        CantidadReclamos                : Integer;
        FechaCreacion                   : DateTime;
        FechaCierre                     : DateTime;
        FechaInicio                     : DateTime;
        FechaFinal                      : DateTime;
        FechaPubRespuestas              : DateTime;
        FechaActoAperturaTecnica        : DateTime;
        FechaActoAperturaEconomica      : DateTime;
        FechaPublicacion                : DateTime;
        FechaAdjudicacion               : DateTime;
        FechaEstimadaAdjudicacion       : DateTime;
        FechaSoporteFisico              : DateTime;
        FechaTiempoEvaluacion           : DateTime;
        FechaEstimadaFirma              : DateTime;
        FechasUsuario                   : DateTime;
        FechaVisitaTerreno              : DateTime;
        FechaEntregaAntecedentes        : DateTime;
        UnidadTiempoEvaluacion          : Integer;
        DireccionVisita                 : String;
        DireccionEntrega                : String;
        Estimacion                      : Integer;
        FuenteFinanciamiento            : String;
        VisibilidadMonto                : Integer;
        MontoEstimado                   : Double;
        Tiempo                          : String;
        UnidadTiempo                    : String;
        Modalidad                       : Integer;
        TipoPago                        : String;
        NombreResponsablePago           : String;
        EmailResponsablePago            : String;
        NombreResponsableContrato       : String;
        EmailResponsableContrato        : String;
        FonoResponsableContrato         : String;
        ProhibicionContratacion         : String;
        SubContratacion                 : String;
        UnidadTiempoDuracionContrato    : Integer;
        TiempoDuracionContrato          : String;
        TipoDuracionContrato            : String;
        JustificacionMontoEstimado      : String;
        ObservacionContract             : String;
        ExtensionPlazo                  : Integer;
        EsBaseTipo                      : Integer;
        UnidadTiempoContratoLicitacion  : String;
        ValorTiempoRenovacion           : String;
        PeriodoTiempoRenovacion         : String;
        EsRenovable                     : Integer;
        AdjudicacionTipo                : Integer;
        AdjudicacionFecha               : DateTime;
        AdjudicacionNumero              : String;
        AdjudicacionNumeroOferentes     : Integer;
        AdjudicacionUrlActa             : String;
        Status                          : String; // (IN = keyword found, OUT = keyword not found)
        Comprador                       : Composition of MercadoPublicoComprador;
        Items                           : Composition of many MercadoPublicoProducto on Items.Licitacione = $self;
};

entity MercadoPublicoComprador: cuid {
        CodigoOrganismo                 : String;
        NombreOrganismo                 : String;
        RutUnidad                       : String;
        CodigoUnidad                    : String;
        NombreUnidad                    : String;
        DireccionUnidad                 : String;
        ComunaUnidad                    : String;
        RegionUnidad                    : String;
        RutUsuario                      : String;
        CodigoUsuario                   : String;
        NombreUsuario                   : String;
        CargoUsuario                    : String;
};


// Mercado Publico Products
entity MercadoPublicoProducto: cuid {
        Correlativo                     : Integer;
        CodigoProducto                  : Integer;
        CodigoCategoria                 : String;
        Categoria                       : String;
        NombreProducto                  : String;
        Descripcion                     : String;
        UnidadMedida                    : String;
        Cantidad                        : Double;
        AdjudicacionRutProveedor        : String;
        AdjudicacionNombreProveedor     : String;
        AdjudicacionCantidad            : Double;
        AdjudicacionMontoUnitario       : Double;
        MatchedProductName              : String;
        MatchedProductKeyword           : String;
        Licitacione                     : Association to MercadoPublicoLicitacione;
};



entity MercadoPublicoClassificationProducts: managed {
    key ProductID                       : Integer;
        ProductName                     : String;
        Keywords                        : Composition of many MercadoPublicoClassificationKeywords on Keywords.Product = $self;
}
entity MercadoPublicoClassificationKeywords: managed {
        Keyword                         : String;
        Product                         : Association to MercadoPublicoClassificationProducts;
}