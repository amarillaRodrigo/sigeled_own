import { io } from '../app.js';
import { createNotificacion, getAdminAndRRHHIds } from '../models/notificacionModel.js';

export async function notifyUser(id_usuario, payload) {
    const notif = await createNotificacion({
        id_usuario,
        tipo: payload?.tipo ?? null,
        mensaje: payload?.mensaje ?? '',
        link: payload?.link ?? null,
        observacion: payload?.observacion ?? null,
        meta: payload?.meta ?? {},
        nivel: payload?.nivel ?? 'info',
    });
    io.to(String(id_usuario)).emit('nueva_notificacion', notif);
    return notif;
}

export async function notifyAdminsRRHH(payload) {
    const ids = await getAdminAndRRHHIds();
    if (!ids?.length) return [];
    const results = await Promise.all(ids.map(id =>
        createNotificacion({
        id_usuario: id,
        tipo: payload?.tipo ?? null,
        mensaje: payload?.mensaje ?? '',
        link: payload?.link ?? null,
        observacion: payload?.observacion ?? null,
        meta: payload?.meta ?? {},
        nivel: payload?.nivel ?? 'info',
        })
    ));
    results.forEach(n => io.to(String(n.id_usuario)).emit('nueva_notificacion', n));
    return results;
}
