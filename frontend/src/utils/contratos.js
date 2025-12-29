function toDate(d) {
    if (!d) return null;
    if (d instanceof Date) return d;

    if (typeof d === "string") {
        const trimmed = d.trim();

        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [year, month, day] = trimmed.split("-").map(Number);
        return new Date(year, month - 1, day);
        }

        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
        const isoLike = trimmed.replace(" ", "T");
        const parsed = new Date(isoLike);
        if (!Number.isNaN(parsed.getTime())) return parsed;
        }
    }

    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function daysDiff(from, to) {
    const f = toDate(from);
    const t = toDate(to);
    if (!f || !t) return NaN;
    const diffMs = t.getTime() - f.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function isActiveContract(c, refDate = new Date()) {
    const hoy = toDate(refDate);
    const inicio = toDate(c.fecha_inicio);
    const fin = toDate(c.fecha_fin);

    if (!inicio || !hoy) return false;

    if (fin) {
        return hoy >= inicio && hoy <= fin;
    }
    return hoy >= inicio;
}

export function isUpcomingContract(c, refDate = new Date(), ventanaDias = 30) {
    const hoy = toDate(refDate);
    const fin = toDate(c.fecha_fin);
    if (!hoy || !fin) return false;

    const diff = daysDiff(hoy, fin);
    return diff > 0 && diff <= ventanaDias;
}

export function isFinishedContract(c, refDate = new Date()) {
    const hoy = toDate(refDate);
    const fin = toDate(c.fecha_fin);
    if (!hoy || !fin) return false;
    return fin < hoy;
}

export function getContratoEstado(c, refDate = new Date()) {
    if (isActiveContract(c, refDate)) return "ACTIVO";
    if (isUpcomingContract(c, refDate)) return "PROXIMO";
    if (isFinishedContract(c, refDate)) return "FINALIZADO";
    return "DESCONOCIDO";
}
