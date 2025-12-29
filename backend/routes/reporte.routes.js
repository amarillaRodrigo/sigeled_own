import express from 'express';
import * as reporteController from "../controllers/reporte.Controller.js";
import { verificarToken } from '../middleware/authMiddleware.js';

const reporteRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reportes
 *   description: API para generar reportes, informes y estadísticas
 */

/**
 * @swagger
 * /api/reportes/informe-escalafonario/{id_persona}:
 *   get:
 *     summary: Obtiene el informe escalafonario completo de un docente
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_persona
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la persona
 *     responses:
 *       200:
 *         description: Informe escalafonario obtenido exitosamente
 *       404:
 *         description: Persona no encontrada
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/informe-escalafonario/:id_persona', verificarToken, reporteController.getInformeEscalafonario);

/**
 * @swagger
 * /api/reportes/informe-escalafonario/{id_persona}/pdf:
 *   get:
 *     summary: Descarga el PDF del informe escalafonario de un docente
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id_persona
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la persona
 *     responses:
 *       200:
 *         description: PDF generado exitosamente
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Persona no encontrada
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/informe-escalafonario/:id_persona/pdf', verificarToken, reporteController.descargarInformeEscalafonarioPDF);

/**
 * @swagger
 * /api/reportes/estadisticas/generales:
 *   get:
 *     summary: Obtiene estadísticas generales del sistema
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/estadisticas/generales', verificarToken, reporteController.getEstadisticasGenerales);

/**
 * @swagger
 * /api/reportes/estadisticas/contratos:
 *   get:
 *     summary: Obtiene estadísticas de contratos por período
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: anio
 *         schema:
 *           type: integer
 *         description: Año para filtrar (opcional)
 *     responses:
 *       200:
 *         description: Estadísticas de contratos obtenidas exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/estadisticas/contratos', verificarToken, reporteController.getEstadisticasContratos);

/**
 * @swagger
 * /api/reportes/estadisticas/titulos:
 *   get:
 *     summary: Obtiene estadísticas de títulos por tipo
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de títulos obtenidas exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/estadisticas/titulos', verificarToken, reporteController.getEstadisticasTitulos);

/**
 * @swagger
 * /api/reportes/estadisticas/documentos:
 *   get:
 *     summary: Obtiene estadísticas de documentos por tipo
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas de documentos obtenidas exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/estadisticas/documentos', verificarToken, reporteController.getEstadisticasDocumentos);

/**
 * @swagger
 * /api/reportes/ranking/antiguedad:
 *   get:
 *     summary: Obtiene ranking de docentes por antigüedad
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Cantidad de resultados a retornar
 *     responses:
 *       200:
 *         description: Ranking obtenido exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/ranking/antiguedad', verificarToken, reporteController.getRankingAntiguedad);

/**
 * @swagger
 * /api/reportes/docentes/listado:
 *   get:
 *     summary: Obtiene listado de docentes con resumen de información
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Texto para buscar por nombre, apellido o DNI
 *       - in: query
 *         name: tiene_contratos_activos
 *         schema:
 *           type: boolean
 *         description: Filtrar solo docentes con contratos activos
 *     responses:
 *       200:
 *         description: Listado obtenido exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/docentes/listado', verificarToken, reporteController.getListadoDocentes);

/**
 * @swagger
 * /api/reportes/contratos/proximos-vencer:
 *   get:
 *     summary: Obtiene contratos próximos a vencer
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: dias
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Días de anticipación para alertas
 *     responses:
 *       200:
 *         description: Contratos obtenidos exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/contratos/proximos-vencer', verificarToken, reporteController.getContratosProximosVencer);

/**
 * @swagger
 * /api/reportes/documentos/digitalizados:
 *   get:
 *     summary: Obtiene documentos digitalizados con filtros
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_persona
 *         schema:
 *           type: integer
 *         description: ID de la persona (opcional)
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *         description: Tipo de documento (opcional)
 *     responses:
 *       200:
 *         description: Documentos obtenidos exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/documentos/digitalizados', verificarToken, reporteController.getDocumentosDigitalizados);

/**
 * @swagger
 * /api/reportes/resumen-completo:
 *   get:
 *     summary: Obtiene un resumen completo con todas las estadísticas e indicadores
 *     tags: [Reportes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumen completo obtenido exitosamente
 *       500:
 *         description: Error del servidor
 */
reporteRouter.get('/resumen-completo', verificarToken, reporteController.getResumenCompleto);

export default reporteRouter;