import { 
    getEstadoLegajoActual,
    getLegajoChecklist,
    recalcularEstadoLegajo as recalcLegajoSvc,
    getPlazoGraciaActivo,
    setPlazoGracia,
    setEstadoLegajo
} from '../models/legajoModel.js';
import { notifyUser, notifyAdminsRRHH } from '../utils/notify.js';
import { getUsuarioIdPorPersonaId } from '../models/userModel.js';
import { getPersonaById } from '../models/personaModel.js';

export const asignarEstadoManual = async (req, res) => {
    try {
        const { id_persona } = req.params;
        const { codigo } = req.body;
        if(!codigo) return res.status(400).json({error: 'codigo requerido'});
        const uid = req.user?.id_usuario ?? req.user?.id ?? null;
        await setEstadoLegajo(id_persona, codigo, uid, 'Asignación manual');
        res.json({ ok:true, codigo })
        try {
            const userRow = await getUsuarioIdPorPersonaId(id_persona);
            if(userRow?.id_usuario){
                await notifyUser(userRow.id_usuario, {
                    tipo: 'LEGAJO_ESTADO',
                    mensaje: codigo === 'COMPLETO' ? '¡Listo! Tu legajo está COMPLETO' : `Tu legajo está ${codigo}`,
                    link: '/dashboard/legajo',
                    meta: { estado: codigo },
                    nivel: codigo === 'COMPLETO' ? 'success' : 'warning'
                });
            }

            const persona = await getPersonaById(id_persona);
            const etiquetaPersona = persona
                ? `${persona.apellido}, ${persona.nombre}`
                : id_persona;

            await notifyAdminsRRHH({
                tipo: 'LEGAJO_ESTADO_CAMBIO',
                mensaje: `${etiquetaPersona} || Estado de legajo: ${codigo}`,
                link: `/dashboard/legajo?persona=${id_persona}`,
                meta: { id_persona, estado: codigo, actor: uid }
            })
        } catch (error) {
            console.warn('asignarEstadoManual notify error:', error.message);
        }
    } catch (error) {
        console.error('Error en asignarEstadoManual:', error);
        res.status(500).json({ error: 'No se pudo asignar estado', detalle: error.message });
    }
}

export const obtenerEstadoLegajo = async(req,res) => {
    try {
        const { id_persona } = req.params;
        const estado = await getEstadoLegajoActual(id_persona);
        const checklist = await getLegajoChecklist(id_persona);
        const plazo = await getPlazoGraciaActivo(id_persona);
        res.json({ estado, checklist, plazo });
    } catch (error) {
        console.error('Error en obtenerEstadoLegajo', error);
        res.status(500).json({error: 'Error al obtener estado de legajo', detalle: error.message});
    }
}

export const recalcularEstadoLegajoCtrl = async(req,res) => {
    try {
        const { id_persona } = req.params;
        const uid = req.user?.id_usuario ?? req.user?.id ?? null;
        const codigo = await recalcLegajoSvc(id_persona, uid);
        res.json({estado: codigo});
        try {
            const userRow = await getUsuarioIdPorPersonaId(id_persona);
            if(userRow?.id_usuario){
                await notifyUser(userRow.id_usuario, {
                    tipo: 'LEGAJO_ESTADO',
                    mensaje: codigo === 'COMPLETO' ? '¡Listo! Tu legajo está COMPLETO' : `Tu legajo está ${codigo}`,
                    link: '/dashboard/legajo',
                    meta: { estado: codigo },
                    nivel: codigo === 'COMPLETO' ? 'success' : 'warning'
                });
            }

            const persona = await getPersonaById(id_persona);
            const etiquetaPersona = persona 
                ? `${persona.apellido}, ${persona.nombre}`
                : id_persona;

            await notifyAdminsRRHH({
                tipo: 'LEGAJO_ESTADO_CAMBIO',
                mensaje: `${etiquetaPersona} || estado de legajo: ${codigo}`,
                link: `/dashboard/legajo?persona=${id_persona}`,
                meta: { id_persona, estado: codigo, actor: uid }
            });
        } catch (error) {
            console.warn('recalcularEstado notify error:', error.message);
        }
    } catch (error) {
        console.error('Error en recalcularEstadoLegajo', error);
        res.status(500).json({error:'Error al recalcular el estado del legajo', detalle: error.message})
    }
}

export const asignarPlazoGracia = async (req, res) => {
    try {
        const { id_persona } = req.params;
        const { fecha_limite, motivo } = req.body;
        if(!fecha_limite) return res.status(400).json({ error: 'fecha_limite requerida (YYYY-MM-DD)' });

        await setPlazoGracia(id_persona, fecha_limite, motivo || null, req.user.id_usuario);
        res.json({ ok: true });
        try {
            const userRow = await getUsuarioIdPorPersonaId(id_persona);
            if (userRow?.id_usuario){
                await notifyUser(userRow.id_usuario, {
                    tipo: 'LEGAJO_PLAZO_GRACIA',
                    mensaje: `Se asignó un plazo de gracias hasta ${fecha_limite}`,
                    link: '/dashboard/legajo',
                    meta: { fecha_limite, motivo: motivo || null }
                });
            }
        } catch (error) {
            console.warn('asignarPlazoGracia notify error:', error.message);
        }
    } catch (error) {
        console.error('Error en asignarPlazoGracia', error);
        res.status(500).json({ error: 'Error al asignar plazo de gracia', detalle: error.message});
    }
}