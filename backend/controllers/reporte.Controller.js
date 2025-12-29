import * as reporteModel from '../models/reporteModel.js';
import { generateInformeEscalafonarioPDF } from '../utils/escalafon.js';

export const getInformeEscalafonario = async (req, res) => {
    try {
        const { id_persona } = req.params;

        const informe = await reporteModel.getInformeEscalafonario(id_persona);

        if (!informe) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró información para el docente especificado'
            });
        }

        res.json({
            success: true,
            data: informe
        });
    } catch (error) {
        console.error('Error al obtener informe escalafonario:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener el informe escalafonario',
            error: error.message
        });
    }
};

export const descargarInformeEscalafonarioPDF = async (req, res) => {
    try {
        const { id_persona } = req.params;

        const informe = await Promise.race([
            reporteModel.getInformeEscalafonario(id_persona),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('La consulta tardó demasiado tiempo')), 30000)
            )
        ]);

        if (!informe) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró información para el docente especificado'
            });
        }

        const pdfBuffer = await generateInformeEscalafonarioPDF(informe);

        const fileName = `informe_escalafonario_${informe.apellido}_${informe.nombre}_${Date.now()}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('Error al generar PDF:', error);
        
        if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            return res.status(503).json({
                success: false,
                message: 'No se pudo conectar a la base de datos. Por favor, verifica tu conexión a internet y vuelve a intentarlo.',
                error: 'Error de conexión a la base de datos'
            });
        }
        
        if (error.message === 'La consulta tardó demasiado tiempo') {
            return res.status(408).json({
                success: false,
                message: 'La consulta tardó demasiado tiempo. Intenta nuevamente.',
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            message: 'Error al generar el PDF del informe',
            error: error.message
        });
    }
};

export const getEstadisticasGenerales = async (req, res) => {
    try {
        const estadisticas = await reporteModel.getEstadisticasGenerales();

        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas generales:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas generales',
            error: error.message
        });
    }
};

export const getEstadisticasContratos = async (req, res) => {
    try {
        const { anio } = req.query;

        const estadisticas = await reporteModel.getEstadisticasContratosPorPeriodo(anio ? parseInt(anio) : null);

        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de contratos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de contratos',
            error: error.message
        });
    }
};

export const getEstadisticasTitulos = async (req, res) => {
    try {
        const estadisticas = await reporteModel.getEstadisticasTitulosPorTipo();

        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de títulos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de títulos',
            error: error.message
        });
    }
};

export const getEstadisticasDocumentos = async (req, res) => {
    try {
        const estadisticas = await reporteModel.getEstadisticasDocumentosPorTipo();

        res.json({
            success: true,
            data: estadisticas
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de documentos:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener estadísticas de documentos',
            error: error.message
        });
    }
};

export const getRankingAntiguedad = async (req, res) => {
    try {
        const { limit } = req.query;

        const ranking = await reporteModel.getRankingDocentesPorAntiguedad(
            limit ? parseInt(limit) : 20
        );

        res.json({
            success: true,
            data: ranking
        });
    } catch (error) {
        console.error('Error al obtener ranking de antigüedad:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener ranking de antigüedad',
            error: error.message
        });
    }
};

export const getListadoDocentes = async (req, res) => {
    try {
        const { search, tiene_contratos_activos } = req.query;

        const filtros = {
            search,
            tiene_contratos_activos: tiene_contratos_activos === 'true'
        };

        const docentes = await reporteModel.getListadoDocentesResumen(filtros);

        res.json({
            success: true,
            data: docentes,
            total: docentes.length
        });
    } catch (error) {
        console.error('Error al obtener listado de docentes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener listado de docentes',
            error: error.message
        });
    }
};

export const getContratosProximosVencer = async (req, res) => {
    try {
        const { dias } = req.query;

        const contratos = await reporteModel.getContratosProximosAVencer(
            dias ? parseInt(dias) : 30
        );

        res.json({
            success: true,
            data: contratos,
            total: contratos.length
        });
    } catch (error) {
        console.error('Error al obtener contratos próximos a vencer:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener contratos próximos a vencer',
            error: error.message
        });
    }
};

export const getDocumentosDigitalizados = async (req, res) => {
    try {
        const { id_persona, tipo } = req.query;

        const filtros = {};
        if (id_persona) filtros.id_persona = parseInt(id_persona);
        if (tipo) filtros.tipo = tipo;

        const documentos = await reporteModel.getDocumentosDigitalizados(filtros);

        res.json({
            success: true,
            data: documentos,
            total: documentos.length
        });
    } catch (error) {
        console.error('Error al obtener documentos digitalizados:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener documentos digitalizados',
            error: error.message
        });
    }
};

/**
 * Obtiene resumen completo de estadísticas e indicadores
 */
export const getResumenCompleto = async (req, res) => {
    try {
        const [
            generales,
            contratos,
            titulos,
            documentos,
            ranking
        ] = await Promise.all([
            reporteModel.getEstadisticasGenerales(),
            reporteModel.getEstadisticasContratosPorPeriodo(new Date().getFullYear()),
            reporteModel.getEstadisticasTitulosPorTipo(),
            reporteModel.getEstadisticasDocumentosPorTipo(),
            reporteModel.getRankingDocentesPorAntiguedad(10)
        ]);

        res.json({
            success: true,
            data: {
                generales,
                contratos_anio_actual: contratos,
                titulos_por_tipo: titulos,
                documentos_por_tipo: documentos,
                top_antiguedad: ranking
            }
        });
    } catch (error) {
        console.error('Error al obtener resumen completo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener resumen completo',
            error: error.message
        });
    }
};