import { getTitulosByPersona, createTitulo, getTiposTitulo, updateEstadoTitulo, getTituloById, deleteTitulo, countArchivoReferencesInTitulos } from "../models/personaTituModel.js";
import { getEstadoById, getEstadoByCodigo } from "../models/estadoVerificacionModel.js";
import { getArchivoById, deleteArchivo } from '../models/archivoModel.js'
import { countArchivoReferences } from "../models/personaDocModel.js";
import { notifyUser, notifyAdminsRRHH } from "../utils/notify.js";
import { getUsuarioIdPorPersonaId } from "../models/userModel.js";

const ALLOWED_ROLES = ['ADMIN', 'RRHH', 'ADMINISTRATIVO'];
const isAdminOrRRHH = (req) => {
    const rolesRaw = Array.isArray(req.user?.roles) ? req.user.roles : [];
    const roles = rolesRaw.map(r => typeof r === 'string' ? r : r?.nombre).filter(Boolean);
    return roles.some(r => ALLOWED_ROLES.includes(String(r).toUpperCase()));
};

export const crearTitulo = async (req, res) => {
    try {
        const data = req.body;
        if(!data.id_persona || !data.id_tipo_titulo || !data.nombre_titulo){
            return res.status(401).json({message:'id_persona, id_tipo_titulo y nombre_titulo son obligatorios'});
        }
        const nuevoTitulo = await createTitulo({
            id_persona: data.id_persona,
            id_tipo_titulo: data.id_tipo_titulo,
            nombre_titulo: data.nombre_titulo,
            institucion: data.institucion || null,
            fecha_emision: data.fecha_emision || null,
            matricula_prof: data.matricula_prof || null,
            id_archivo: data.id_archivo || null,
            verificado_por_usuario: null,
            verificado_en: null,
            id_estado_verificacion: data.id_estado_verificacion || 1,
            creado_en: data.creado_en || new Date()
        });
        res.status(201).json(nuevoTitulo);
    } catch (error) {
        console.error('Error en crearTitulo:', error);
        res.status(500).json({message:'Error al crear titulo', detalle:error.message});
    }
}

export const encontrarTituloPersona = async (req, res) => {
    try {
        const { id_persona } = req.params;
        const titulo = await getTitulosByPersona(id_persona);
        res.json(titulo);
    } catch (error) {
        console.error('Error en findTituloPersona:', error);
        res.status(500).json({message:'Error al encontrar titulo por persona', detalle:error.message});
    }
}

export const listarTiposTitulo = async (_req, res) => {
    try {
        const tipos = await getTiposTitulo();
        res.json(tipos);
    } catch (error) {
        console.error('Error en listarTiposTitulo:', error);
        res.status(500).json({message:'Error al listar tipos de titulo', detalle:error.message});
    }
}

const toSmallint = (v) => {
    if (v === null || v === undefined) return null;
    const n = parseInt(String(v), 10);
    return Number.isInteger(n) ? n : null;
};

const resolveEstado = async (val) => {
    const n = toSmallint(val);
    if (n !== null) return await getEstadoById(n);
    return await getEstadoByCodigo(String(val)); 
};

export const verificarTitulo = async (req, res) => {
    try {
        const id_titulo = String(req.params.id_titulo); 
        const { id_estado_verificacion, observacion } = req.body;
        const obsStr = String(observacion ?? '').trim() || null;

        const estado = await resolveEstado(id_estado_verificacion);
        if (!estado) return res.status(400).json({ message: "Estado inválido" });

        const code = String(estado.codigo || "").toUpperCase();
        const notifNivel =
            code === 'APROBADO' ? 'success' :
            code === 'RECHAZADO' ? 'error'  :
            code === 'OBSERVADO' ? 'warning': 'info';

        const verificado_por_usuario =
        req.user?.id_usuario ?? req.user?.id ?? req.usuario?.id_usuario ?? req.usuario?.id ?? null;

        const actualizado = await updateEstadoTitulo({
            id_titulo,
            id_estado_verificacion: estado.id_estado,
            observacion: obsStr,
            verificado_por_usuario
        });


        res.json(actualizado);

        try {
            const usuarioDestino = await getUsuarioIdPorPersonaId(actualizado.id_persona);
            if (usuarioDestino?.id_usuario) {
                await notifyUser(usuarioDestino.id_usuario, {
                tipo: 'TITULO_ESTADO',
                mensaje: `Tu título "${actualizado.nombre_titulo}" ha sido ${estado.codigo}`,
                link: '/dashboard/legajo',
                observacion: obsStr,
                meta: { id_titulo, estado: estado.codigo, observacion: obsStr },
                nivel: notifNivel
                });
            }

            await notifyAdminsRRHH({
                tipo: 'TITULO_VERIFICADO',
                mensaje: `Título "${actualizado.nombre_titulo}" de ${actualizado.persona_nombre || actualizado.id_persona} marcado como ${estado.codigo}`,
                link: `/dashboard/legajo?persona=${actualizado.id_persona}`,
                observacion: obsStr, 
                meta: { id_titulo, estado: estado.codigo, observacion: obsStr, actor: verificado_por_usuario },
                nivel: notifNivel
            });
            } catch (error) {
            console.warn('verificarTitulo notify error:', error.message);
        }
    } catch (error) {
        console.error("Error en verificarTitulo:", error);
        res.status(500).json({ message: "Error al verificar título", detalle: error.message });
    }
};

export const eliminarTitulo = async (req, res, next) => {
    try {
        const { id_persona, id_titulo } = req.params;
        if(!id_persona || !id_titulo){
            return res.status(400).json({ success:false, message: 'id_persona e id_titulo requeridos' })
        }

        const titulo = await getTituloById(id_titulo);
        if(!titulo) return res.status(404).json({ success:false, message:'Título no encontrado' });

        if(String(titulo.id_persona) !== String(id_persona)){
            return res.status(400).json({ success:false, message: 'El título no pertenece a la persona indicada' });
        }

        const archivo = titulo.id_archivo ? await getArchivoById(titulo.id_archivo) : null;
        const isUploader = archivo && req.user && String(req.user.id_usuario) === String(archivo.subido_por_usuario);
        if(!isAdminOrRRHH(req) && !isUploader){
            return res.status(403).json({ success:false, message: 'No autorizado para eliminar este título' });
        }

        const deleted = await deleteTitulo(id_titulo);

        try {
            const usuarioDestino = await getUsuarioIdPorPersonaId(titulo.id_persona);
            if (usuarioDestino?.id_usuario) {
                await notifyUser(usuarioDestino.id_usuario, {
                tipo: 'TITULO_ELIMINADO',
                mensaje: `Se eliminó tu título "${titulo.nombre_titulo}"`,
                link: '/dashboard/legajo',
                meta: { id_titulo, id_persona: titulo.id_persona },
                nivel: 'warning'
                });
            }
            await notifyAdminsRRHH({
                tipo: 'TITULO_ELIMINADO',
                mensaje: `${titulo.persona_nombre || titulo.id_persona}: título eliminado (${titulo.nombre_titulo})`,
                link: `/dashboard/legajo?persona=${titulo.id_persona}`,
                meta: {
                id_titulo,
                id_persona: titulo.id_persona,
                eliminado_por: req.user?.id_usuario ?? req.user?.id ?? null
                },
                nivel: 'warning'
            });
        } catch (e) {
            console.warn('[titulo-delete] notify error:', e.message);
}

        if(archivo?.id_archivo){
            try {
                const cntDocs = await countArchivoReferences(archivo.id_archivo);
                const cntTit = await countArchivoReferencesInTitulos(archivo.id_archivo);
                const totalRefs = Number(cntDocs) + Number(cntTit);
                if (totalRefs === 0) await deleteArchivo(archivo.id_archivo);
            } catch (error) {
                console.warn('[titulo-delete] limpieza archivo:', error.message);
            }
        }

        return res.status(200).json({success:true, data:deleted});
    } catch (error) {
        console.error('[titulo-delete] error:', error);
        return next(error);
    }
}

export const solicitarEliminacionTitulo = async (req, res) => {
    try {
        const { id_titulo } = req.params;
        const motivo = req.body?.motivo || null;

        const t = await getTituloById(id_titulo);
        if (!t) return res.status(404).json({ message: 'Título no encontrado' });

        await notifyAdminsRRHH({
        tipo: 'TITULO_DELETE_SOLICITUD',
        mensaje: `${t.persona_nombre || t.id_persona} solicitó eliminar el título "${t.nombre_titulo}"`,
        link: `/dashboard/legajo?persona=${t.id_persona}`,
        meta: { id_titulo, id_persona: t.id_persona, motivo },
        nivel: 'warning'
        });

        await notifyUser(req.user?.id_usuario ?? req.user?.id, {
        tipo: 'TITULO_DELETE_SOLICITUD',
        mensaje: `Tu solicitud de eliminación del título "${t.nombre_titulo}" fue enviada`,
        link: '/dashboard/legajo',
        meta: { id_titulo },
        nivel: 'info'
        });

        res.json({ ok: true });
    } catch (error) {
        console.error('solicitarEliminacionTitulo:', error);
        res.status(500).json({ message: 'Error al solicitar eliminación', detalle: error.message });
    }
};
