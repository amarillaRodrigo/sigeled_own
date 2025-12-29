import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contratoService, personaService } from "../../services/api";
import { useToast } from "../../components/ToastProvider";
import {
    FiArrowLeft,
    FiSave,
    FiAlertCircle,
    FiTrash2,
} from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

const Panel = ({ className = "", ...props }) => (
    <div
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`}
        {...props}
    />
);

const SolidBtn = ({ className = "", ...props }) => (
    <button
        className={`px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#0D1520] hover:bg-[#2af935] cursor-pointer transition ${className}`}
        {...props}
    />
);

const Field = ({ label, children, hint }) => (
    <div className="space-y-1">
        <label className="block text-sm opacity-80">{label}</label>
        {children}
        {hint && <p className="text-xs opacity-60">{hint}</p>}
    </div>
);

export default function ContratoNuevo() {
    const { idPersona } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const qc = useQueryClient();

    const [form, setForm] = useState({
        id_persona: idPersona || "",
        id_profesor: "",
        id_periodo: "",
        fecha_inicio: "",
        fecha_fin: "",
        id_carrera: "",
    });

    const [items, setItems] = useState([
        { id_anio: "", id_materia: "", cargo: "", horas_semanales: "" },
    ]);

    const [otrosItems, setOtrosItems] = useState([
        {
            id_perfil: "",
            tipo_item: "",
            descripcion_actividad: "",
            cargo: "",
            horas_semanales: "",
            id_carrera: "",
        },
    ]);

    const [materiasPorAnio, setMateriasPorAnio] = useState({});
    const [overlapError, setOverlapError] = useState(null);

    const onChange = (k, v) => {
        setForm((s) => ({ ...s, [k]: v }));

        if (k === "id_carrera") {
            setItems([
                {
                    id_anio: "",
                    id_materia: "",
                    cargo: "",
                    horas_semanales: "",
                },
            ]);
            setMateriasPorAnio({});
        }
    };

    const {
        data: perfilesTarifas = [],
    } = useQuery({
        queryKey: ["tarifas-contrato", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await contratoService.getTarifasByPersona(idPersona);
            return Array.isArray(data) ? data : [];
        },
    });

    const normalizeTarifas = (raw) => {
        if (Array.isArray(raw)) return raw;
        if (typeof raw === "string") {
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const perfiles = perfilesTarifas.map((p) => ({
        ...p,
        tarifas: normalizeTarifas(p.tarifas),
    }));

    const perfilProfesor = perfiles.find(
        (p) => p.perfil_codigo === "PROF" || p.perfil_nombre === "Profesor"
    );
    const perfilCoordinador = perfiles.find(
        (p) => p.perfil_codigo === "COOR" || p.perfil_nombre === "Coordinador"
    );
    const perfilInvestigador = perfiles.find(
        (p) => p.perfil_codigo === "INVEST" || p.perfil_nombre === "Investigador"
    );
    const perfilAdmin = perfiles.find(
        (p) => p.perfil_codigo === "ADMITVO" || p.perfil_nombre === "Administrativo"
    );
    const perfilRRHH = perfiles.find(
        (p) => p.perfil_codigo === "RRHH" || p.perfil_nombre === "Recursos Humanos"
    );


    const tarifasProfesor = perfilProfesor?.tarifas || [];
    const tarifasCoordinador = perfilCoordinador?.tarifas || [];
    const tarifasInvestigador = perfilInvestigador?.tarifas || [];
    const tarifasAdmin = perfilAdmin?.tarifas || [];
    const tarifasRRHH = perfilRRHH?.tarifas || [];

    const perfilesNoProfesor = perfiles.filter((p) => p.perfil_codigo !== "PROF");
    const mostrarSeccionDocencia = !!perfilProfesor;
    const mostrarActividadesAdicionales = perfilesNoProfesor.length > 0;

    const {
        data: profDetalles,
        isLoading: loadingProf,
        error: errorProf,
    } = useQuery({
        queryKey: ["profesor-detalles", idPersona],
        enabled: !!idPersona && !!perfilProfesor,
        queryFn: async () => {
            const { data } = await contratoService.getProfesorDetalles(
                idPersona
            );
            return data ?? null;
        },
    });

    const { data: personaBasic } = useQuery({
        queryKey: ["persona", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await personaService.getPersonaByID(idPersona);
            return data ?? null;
        },
    });

    useEffect(() => {
        if (profDetalles) {
            setForm((prev) => ({
                ...prev,
                id_persona: profDetalles.id_persona ?? idPersona,
                id_profesor: profDetalles.id_profesor ?? prev.id_profesor,
            }));
        }
    }, [profDetalles, idPersona]);

    useEffect(() => {
        if (perfilesNoProfesor.length !== 1) return;

        const unico = perfilesNoProfesor[0];

        const tipoPorDefecto =
            unico.perfil_codigo === "COOR"
                ? "COORDINACION"
                : unico.perfil_codigo === "INVEST"
                ? "INVESTIGACION"
                : unico.perfil_codigo === "ADMITVO"
                ? "ADMINISTRATIVO"
                : unico.perfil_codigo === "RRHH"
                ? "RRHH"
                : "";

        setOtrosItems((prev) => {
            if (!prev || prev.length === 0) {
                return [
                    {
                        id_perfil: unico.id_perfil,
                        tipo_item: tipoPorDefecto,
                        descripcion_actividad: "",
                        cargo: "",
                        horas_semanales: "",
                        id_carrera: "",
                    },
                ];
            }

            const first = prev[0];
            const alreadyMatch =
                String(first.id_perfil || "") === String(unico.id_perfil || "") &&
                (first.tipo_item || "") === (tipoPorDefecto || "");

            if (alreadyMatch) {
                return prev;
            }

            return prev.map((row, idx) =>
                idx === 0
                    ? {
                        ...row,
                        id_perfil: row.id_perfil || unico.id_perfil,
                        tipo_item: row.tipo_item || tipoPorDefecto,
                    }
                    : row
            );
        });
    }, [perfiles]);

    const totalHorasSem = useMemo(() => {
        const horasDocencia = items.reduce(
            (acc, it) => acc + (Number(it.horas_semanales) || 0),
            0
        );

        const horasExtras = otrosItems.reduce(
            (acc, it) => acc + (Number(it.horas_semanales) || 0),
            0
        );

        return horasDocencia + horasExtras;
    }, [items, otrosItems]);

    const { data: carreras = [] } = useQuery({
        queryKey: ["carreras"],
        queryFn: async () => {
            const { data } = await contratoService.getCarreras();
            return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
    });

    const { data: anios = [] } = useQuery({
        queryKey: ["anios"],
        queryFn: async () => {
            const { data } = await contratoService.getAnios();
            return data ?? [];
        },
        staleTime: 30 * 60 * 1000,
    });

    const { data: periodos = [] } = useQuery({
        queryKey: ["periodos"],
        queryFn: async () => {
            const { data } = await contratoService.getPeriodos();
            return Array.isArray(data) ? data : [];
        },
        staleTime: 30 * 60 * 1000,
    });

    const createContratoMutation = useMutation({
        mutationFn: (payload) =>
            contratoService.createGeneral(payload).then((r) => r.data),
        onSuccess: (nuevo) => {
            qc.invalidateQueries({ queryKey: ["contratos", "all"] });
            if (nuevo?.id_persona) {
                qc.invalidateQueries({
                    queryKey: ["contratos", "byPersona", nuevo.id_persona],
                });
            }
            qc.invalidateQueries({
                predicate: ({ queryKey }) =>
                    Array.isArray(queryKey) && queryKey[0] === "empleados",
            });
            toast.success("Contrato creado con éxito");
            navigate("/dashboard/contratos");
        },
        onError: (error) => {
            console.error(error);
            const status = error?.response?.status;
            const data = error?.response?.data;
            const msg = data?.error || data?.details || "";

            if (
                status === 409 &&
                typeof msg === "string" &&
                msg.includes("Solapamiento")
            ) {
                setOverlapError({
                    message: msg,
                    fecha_inicio: form.fecha_inicio,
                    fecha_fin: form.fecha_fin,
                });
                return;
            }

            if (Array.isArray(data?.missingFields)) {
                toast.warning(
                    "Faltan campos requeridos:\n- " +
                        data.missingFields.join("\n- ")
                );
            } else if (Array.isArray(data?.details)) {
                const lines = data.details.map(
                    (e) =>
                        `${e.param || e.path || "campo"}: ${
                            e.msg || e.message || "inválido"
                        }`
                );
                toast.warning("Validación fallida:\n- " + lines.join("\n- "));
            } else {
                toast.error(
                    data?.error || data?.details || "Error al crear contrato"
                );
            }
        },
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const itemsDocenciaLimpios = items
            .map((it) => ({
                ...it,
                id_materia: it.id_materia || "",
                cargo: it.cargo || "",
                horas_semanales: it.horas_semanales,
            }))
            .filter(
                (it) => it.id_materia || it.cargo || it.horas_semanales
            );

        const otrosLimpios = otrosItems
            .map((it) => ({
                ...it,
                id_perfil: it.id_perfil || "",
                tipo_item: (it.tipo_item || "").toUpperCase(),
                descripcion_actividad: it.descripcion_actividad || "",
                cargo: it.cargo || "",
                horas_semanales: it.horas_semanales,
            }))
            .filter(
                (it) =>
                    it.id_perfil &&
                    it.tipo_item &&
                    it.descripcion_actividad &&
                    it.cargo &&
                    it.horas_semanales
            );

        if (!itemsDocenciaLimpios.length && !otrosLimpios.length) {
            toast.warning(
                "Debe cargar al menos una materia o una actividad adicional"
            );
            return;
        }

        const itemsPayload = [];

        if (itemsDocenciaLimpios.length && perfilProfesor?.id_perfil) {
            itemsDocenciaLimpios.forEach((it) => {
                if (!it.id_materia || !it.cargo || !it.horas_semanales) {
                    return;
                }

                itemsPayload.push({
                    id_perfil: Number(perfilProfesor.id_perfil),
                    tipo_item: "DOCENCIA",
                    id_materia: it.id_materia,
                    descripcion_actividad: null,
                    codigo_cargo: it.cargo,
                    horas_semanales: Number(it.horas_semanales),
                });
            });
        }

        otrosLimpios.forEach((it) => {
            itemsPayload.push({
                id_perfil: Number(it.id_perfil),
                tipo_item: it.tipo_item,
                id_materia: null,
                descripcion_actividad: it.descripcion_actividad,
                codigo_cargo: it.cargo,
                horas_semanales: Number(it.horas_semanales),
            });
        });

        if (!itemsPayload.length) {
            toast.warning(
                "Debe cargar al menos una materia o una actividad adicional válida"
            );
            return;
        }

        const payload = {
            id_persona: form.id_persona,
            id_periodo: Number(form.id_periodo),
            fecha_inicio: form.fecha_inicio,
            fecha_fin: form.fecha_fin,
            items: itemsPayload,
        };

        await createContratoMutation.mutateAsync(payload);
    };

    const nombreProfesor = profDetalles
        ? `${profDetalles.apellido || ""} ${
                profDetalles.nombre || ""
            }`.trim()
        : "";

    const nombrePersonaFallback = personaBasic
        ? `${personaBasic.apellido || ""} ${
                personaBasic.nombre || ""
            }`.trim()
        : "";

    const displayNombre =
        nombreProfesor || nombrePersonaFallback || `Persona #${idPersona}`;

    const creandoSoloActividades =
        !mostrarSeccionDocencia && mostrarActividadesAdicionales;

    return (
        <>
        <motion.div
            className="p-6 space-y-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => navigate("/dashboard/contratos")}
                    className="p-2 rounded-xl border border-[#2B3642] hover:bg-[#1A2430] cursor-pointer transition-all"
                >
                    <FiArrowLeft />
                </button>
                <h1 className="text-2xl font-semibold text-[#19F124]">
                    Nuevo contrato
                </h1>
            </div>

            <Panel className="p-5 space-y-5">
                {loadingProf && (
                    <div className="text-sm opacity-70">
                        Cargando datos del profesor…
                    </div>
                )}
                {errorProf && (
                    <div className="mb-3 text-sm text-red-400">
                        No se pudo obtener los datos del profesor. Verificá que
                        tenga registro en la tabla
                        <code className="ml-1">profesor</code>.
                    </div>
                )}

                <motion.div
                    className="p-3 rounded-lg bg-[#242E38] text-sm flex flex-wrap gap-2 justify-between items-center"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <div>
                        Creando contrato para{" "}
                        <strong className="text-[#19F124]">
                            {displayNombre}
                        </strong>
                    </div>
                    <div className="text-xs opacity-70">
                        Total horas semanales:{" "}
                        <span className="font-semibold">
                            {totalHorasSem || 0} hs
                        </span>
                    </div>
                </motion.div>

                {creandoSoloActividades && (
                    <div className="text-xs text-[#FFC107] bg-[#3a2b12] border border-[#FFC10755] rounded-xl px-3 py-2">
                        Esta persona no tiene perfil de profesor, por lo que
                        solo se podrán cargar actividades adicionales
                        (coordinación, investigación, administrativo, etc.).
                    </div>
                )}

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        {mostrarSeccionDocencia && (
                            <section className="space-y-4">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9fb2c1]">
                                    Docencia
                                </h2>

                                <Field label="Carrera">
                                    <select
                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                        value={form.id_carrera}
                                        onChange={(e) =>
                                            onChange(
                                                "id_carrera",
                                                e.target.value
                                            )
                                        }
                                    >
                                        <option value="">Seleccionar…</option>
                                        {carreras.map((c) => (
                                            <option
                                                key={c.id_carrera}
                                                value={c.id_carrera}
                                            >
                                                {c.carrera_descripcion}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Detalle por materia y rol">
                                    <div className="space-y-4">
                                        <AnimatePresence initial={false}>
                                            {items.map((it, idx) => {
                                                const materiasDeFila = it.id_anio
                                                    ? materiasPorAnio[
                                                            it.id_anio
                                                        ] || []
                                                    : [];

                                                const tarifaRol =
                                                    it.cargo &&
                                                    tarifasProfesor.length
                                                        ? tarifasProfesor.find(
                                                                (t) =>
                                                                    t.codigo_cargo ===
                                                                    it.cargo
                                                            )
                                                        : null;

                                                return (
                                                    <motion.div
                                                        key={idx}
                                                        className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end bg-[#18222f] p-3 rounded-xl"
                                                        initial={{
                                                            opacity: 0,
                                                            y: 4,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            y: -4,
                                                        }}
                                                        transition={{
                                                            duration: 0.15,
                                                        }}
                                                    >
                                                        <div className="md:col-span-5">
                                                            <label className="block mb-1 text-xs opacity-80">
                                                                Año y materia
                                                            </label>
                                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                                <select
                                                                    className="w-full sm:w-24 px-3 py-2 bg-[#242E38] rounded-xl text-xs"
                                                                    value={
                                                                        it.id_anio
                                                                    }
                                                                    onChange={async (
                                                                        e
                                                                    ) => {
                                                                        const nuevoAnio =
                                                                            e
                                                                                .target
                                                                                .value;

                                                                        setItems(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev.map(
                                                                                    (
                                                                                        row,
                                                                                        i
                                                                                    ) =>
                                                                                        i ===
                                                                                        idx
                                                                                            ? {
                                                                                                ...row,
                                                                                                id_anio:
                                                                                                    nuevoAnio,
                                                                                                id_materia:
                                                                                                    "",
                                                                                            }
                                                                                            : row
                                                                                )
                                                                        );

                                                                        if (
                                                                            !form.id_carrera ||
                                                                            !nuevoAnio
                                                                        )
                                                                            return;

                                                                        if (
                                                                            !materiasPorAnio[
                                                                                nuevoAnio
                                                                            ]
                                                                        ) {
                                                                            try {
                                                                                const { data } =
                                                                                    await contratoService.getMateriasByCarreraAnio(
                                                                                        form.id_carrera,
                                                                                        nuevoAnio
                                                                                    );
                                                                                setMateriasPorAnio(
                                                                                    (
                                                                                        prev
                                                                                    ) => ({
                                                                                        ...prev,
                                                                                        [nuevoAnio]:
                                                                                            Array.isArray(
                                                                                                data
                                                                                            )
                                                                                                ? data
                                                                                                : [],
                                                                                    })
                                                                                );
                                                                            } catch (err) {
                                                                                console.error(
                                                                                    err
                                                                                );
                                                                                toast.error(
                                                                                    "No se pudieron cargar las materias para ese año"
                                                                                );
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    <option value="">
                                                                        Año
                                                                    </option>
                                                                    {anios.map(
                                                                        (a) => (
                                                                            <option
                                                                                key={
                                                                                    a.id_anio
                                                                                }
                                                                                value={
                                                                                    a.id_anio
                                                                                }
                                                                            >
                                                                                {
                                                                                    a.descripcion
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>

                                                                <select
                                                                    className="flex-1 px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                                    value={
                                                                        it.id_materia
                                                                    }
                                                                    onChange={(
                                                                        e
                                                                    ) =>
                                                                        setItems(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev.map(
                                                                                    (
                                                                                        row,
                                                                                        i
                                                                                    ) =>
                                                                                        i ===
                                                                                        idx
                                                                                            ? {
                                                                                                ...row,
                                                                                                id_materia:
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                            }
                                                                                            : row
                                                                                )
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        !it.id_anio ||
                                                                        !materiasDeFila.length
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        {!it.id_anio
                                                                            ? "Elegí año primero"
                                                                            : materiasDeFila.length
                                                                            ? "Seleccionar…"
                                                                            : "Sin materias en ese año"}
                                                                    </option>
                                                                    {materiasDeFila.map(
                                                                        (m) => (
                                                                            <option
                                                                                key={
                                                                                    m.id_materia
                                                                                }
                                                                                value={
                                                                                    m.id_materia
                                                                                }
                                                                            >
                                                                                {
                                                                                    m.descripcion_materia
                                                                                }
                                                                            </option>
                                                                        )
                                                                    )}
                                                                </select>
                                                            </div>
                                                        </div>

                                                        <div className="md:col-span-3">
                                                            <label className="block mb-1 text-xs opacity-80">
                                                                Rol
                                                            </label>
                                                            <select
                                                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                                value={
                                                                    it.cargo
                                                                }
                                                                onChange={(e) =>
                                                                    setItems(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    row,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                            ...row,
                                                                                            cargo: e
                                                                                                .target
                                                                                                .value,
                                                                                        }
                                                                                        : row
                                                                            )
                                                                    )
                                                                }
                                                            >
                                                                <option value="">
                                                                    Seleccionar…
                                                                </option>
                                                                {tarifasProfesor.length >
                                                                0 ? (
                                                                    tarifasProfesor.map(
                                                                        (t) => (
                                                                            <option
                                                                                key={
                                                                                    t.codigo_cargo
                                                                                }
                                                                                value={
                                                                                    t.codigo_cargo
                                                                                }
                                                                            >
                                                                                {
                                                                                    t.descripcion
                                                                                }{" "}
                                                                                ($
                                                                                {
                                                                                    t.monto_hora
                                                                                }{" "}
                                                                                / h)
                                                                            </option>
                                                                        )
                                                                    )
                                                                ) : (
                                                                    <>
                                                                        <option value="TITULAR">
                                                                            Titular
                                                                        </option>
                                                                        <option value="JTP">
                                                                            JTP
                                                                        </option>
                                                                        <option value="AUXILIAR">
                                                                            Auxiliar
                                                                        </option>
                                                                        <option value="COORDINADOR">
                                                                            Coordinador
                                                                        </option>
                                                                    </>
                                                                )}
                                                            </select>
                                                        </div>

                                                        <div className="md:col-span-3">
                                                            <label className="block mb-1 text-xs opacity-80">
                                                                Horas
                                                                semanales
                                                            </label>
                                                            <input
                                                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                                value={
                                                                    it.horas_semanales
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) =>
                                                                    setItems(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.map(
                                                                                (
                                                                                    row,
                                                                                    i
                                                                                ) =>
                                                                                    i ===
                                                                                    idx
                                                                                        ? {
                                                                                                ...row,
                                                                                                horas_semanales:
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                            }
                                                                                        : row
                                                                            )
                                                                    )
                                                                }
                                                            />
                                                        </div>

                                                        <div className="flex items-center justify-end md:col-span-1 md:justify-center">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setItems(
                                                                        (
                                                                            prev
                                                                        ) =>
                                                                            prev.filter(
                                                                                (
                                                                                    _,
                                                                                    i
                                                                                ) =>
                                                                                    i !==
                                                                                    idx
                                                                            )
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 px-2 py-2 text-xs text-red-500 transition-all border cursor-pointer rounded-xl border-red-500/60 hover:bg-red-500/10"
                                                                aria-label="Eliminar fila de materia"
                                                            >
                                                                <FiTrash2
                                                                    size={20}
                                                                />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setItems((prev) => [
                                                    ...prev,
                                                    {
                                                        id_anio: "",
                                                        id_materia: "",
                                                        cargo: "",
                                                        horas_semanales: "",
                                                    },
                                                ])
                                            }
                                            className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#19F124] text-[#19F124] hover:bg-[#19F124] hover:text-[#0D1520] cursor-pointer text-sm"
                                        >
                                            + Agregar materia / rol
                                        </button>

                                        {!form.id_carrera && (
                                            <div className="text-xs opacity-70">
                                                Primero seleccioná una carrera
                                                para poder elegir año y
                                                materias.
                                            </div>
                                        )}
                                    </div>
                                </Field>
                            </section>
                        )}

                        {mostrarActividadesAdicionales && (
                            <section className="space-y-4 pt-2 border-t border-[#1b2a37]">
                                <h2 className="text-sm font-semibold uppercase tracking-wide text-[#9fb2c1]">
                                    Actividades adicionales
                                </h2>
                                <Field label="Actividades adicionales (Coordinador, Investigación, Administrativo, RRHH)">
                                    <div className="space-y-4">
                                        <AnimatePresence initial={false}>
                                            {otrosItems.map((it, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    className="grid grid-cols-1 md:grid-cols-12 gap-3 md:items-end bg-[#18222f] p-3 rounded-xl"
                                                    initial={{
                                                        opacity: 0,
                                                        y: 4,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        y: -4,
                                                    }}
                                                    transition={{
                                                        duration: 0.15,
                                                    }}
                                                >
                                                    <div className="md:col-span-3">
                                                        <label className="block mb-1 text-xs opacity-80">
                                                            Perfil
                                                        </label>
                                                        <select
                                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                            value={it.id_perfil}
                                                            onChange={(e) => {
                                                                const id_perfil =
                                                                    e.target
                                                                        .value;
                                                                const perfilSel =
                                                                    perfiles.find((p) => String(p.id_perfil) === String(id_perfil));

                                                                const tipoPorDefecto =
                                                                    perfilSel?.perfil_codigo === "COOR"
                                                                        ? "COORDINACION"
                                                                        : perfilSel?.perfil_codigo === "INVEST"
                                                                        ? "INVESTIGACION"
                                                                        : perfilSel?.perfil_codigo === "ADMITVO"
                                                                        ? "ADMINISTRATIVO"
                                                                        : perfilSel?.perfil_codigo === "RRHH"
                                                                        ? "RRHH"
                                                                        : "";

                                                                setOtrosItems(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                row,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                        ...row,
                                                                                        id_perfil,
                                                                                        tipo_item:
                                                                                            tipoPorDefecto ||
                                                                                            row.tipo_item,
                                                                                        cargo: "",
                                                                                    }
                                                                                    : row
                                                                        )
                                                                );
                                                            }}
                                                        >
                                                            <option value="">
                                                                Seleccionar…
                                                            </option>
                                                            {perfilesNoProfesor.map((p) => (
                                                                <option key={p.id_perfil} value={p.id_perfil}>
                                                                        {p.perfil_nombre || "Perfil sin nombre"} ({p.perfil_codigo})
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div className="md:col-span-3">
                                                        <label className="block mb-1 text-xs opacity-80">
                                                            Tipo de actividad
                                                        </label>
                                                        <input
                                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                            value={
                                                                it.tipo_item
                                                            }
                                                            onChange={(e) =>
                                                                setOtrosItems(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                row,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                        ...row,
                                                                                        tipo_item:
                                                                                            e.target.value.toUpperCase(),
                                                                                    }
                                                                                : row
                                                                        )
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="md:col-span-3">
                                                        <label className="block mb-1 text-xs opacity-80">
                                                            Cargo
                                                        </label>
                                                        <select
                                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                            value={it.cargo}
                                                            onChange={(e) =>
                                                                setOtrosItems(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                row,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                        ...row,
                                                                                        cargo: e
                                                                                            .target
                                                                                            .value,
                                                                                    }
                                                                                    : row
                                                                        )
                                                                )
                                                            }
                                                            disabled={
                                                                !it.id_perfil
                                                            }
                                                        >
                                                            <option value="">
                                                                Seleccionar…
                                                            </option>
                                                            {(() => {
                                                                const perfilSel =
                                                                    perfiles.find(
                                                                        (p) =>
                                                                            String(
                                                                                p.id_perfil
                                                                            ) ===
                                                                            String(
                                                                                it.id_perfil
                                                                            )
                                                                    );
                                                                const tarifas =
                                                                    perfilSel?.perfil_codigo === "COOR"
                                                                        ? tarifasCoordinador
                                                                        : perfilSel?.perfil_codigo === "INVEST"
                                                                        ? tarifasInvestigador
                                                                        : perfilSel?.perfil_codigo === "ADMITVO"
                                                                        ? tarifasAdmin
                                                                        : perfilSel?.perfil_codigo === "RRHH"
                                                                        ? tarifasRRHH
                                                                        : [];

                                                                return tarifas.map(
                                                                    (t) => (
                                                                        <option
                                                                            key={
                                                                                t.codigo_cargo
                                                                            }
                                                                            value={
                                                                                t.codigo_cargo
                                                                            }
                                                                        >
                                                                            {
                                                                                t.descripcion
                                                                            }{" "}
                                                                            ($
                                                                            {
                                                                                t.monto_hora
                                                                            }{" "}
                                                                            / h)
                                                                        </option>
                                                                    )
                                                                );
                                                            })()}
                                                        </select>
                                                    </div>

                                                    <div className="md:col-span-2">
                                                        <label className="block mb-1 text-xs opacity-80">
                                                            Horas semanales
                                                        </label>
                                                        <input
                                                            className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                            value={
                                                                it.horas_semanales
                                                            }
                                                            onChange={(e) =>
                                                                setOtrosItems(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                row,
                                                                                i
                                                                            ) =>
                                                                                i ===
                                                                                idx
                                                                                    ? {
                                                                                        ...row,
                                                                                        horas_semanales:
                                                                                            e.target
                                                                                                .value,
                                                                                    }
                                                                                : row
                                                                        )
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    <div className="md:col-span-12">
                                                    {(() => {
                                                        const perfilSel = perfiles.find(
                                                            (p) => String(p.id_perfil) === String(it.id_perfil)
                                                        );

                                                        const esCoordinador =
                                                            perfilSel?.perfil_codigo === "COOR" ||
                                                            /coordinador/i.test(perfilSel?.perfil_nombre || "");

                                                        if (esCoordinador) {
                                                            return (
                                                                <>
                                                                    <label className="block mb-1 text-xs opacity-80">
                                                                        Carrera a coordinar (se usará en la
                                                                        descripción de la actividad)
                                                                    </label>
                                                                    <select
                                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                                        value={it.id_carrera || ""}
                                                                        onChange={(e) => {
                                                                            const id_carrera = e.target.value;
                                                                            const carreraSel = carreras.find(
                                                                                (c) =>
                                                                                    String(c.id_carrera) ===
                                                                                    String(id_carrera)
                                                                            );
                                                                            const descripcion = carreraSel
                                                                                ? `Coordinador de la ${carreraSel.carrera_descripcion}`
                                                                                : "";

                                                                            setOtrosItems((prev) =>
                                                                                prev.map((row, i) =>
                                                                                    i === idx
                                                                                        ? {
                                                                                            ...row,
                                                                                            id_carrera,
                                                                                            descripcion_actividad:
                                                                                                descripcion,
                                                                                        }
                                                                                        : row
                                                                                )
                                                                            );
                                                                        }}
                                                                    >
                                                                        <option value="">
                                                                            Seleccionar carrera…
                                                                        </option>
                                                                        {carreras.map((c) => (
                                                                            <option
                                                                                key={c.id_carrera}
                                                                                value={c.id_carrera}
                                                                            >
                                                                                {c.carrera_descripcion}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    {it.descripcion_actividad && (
                                                                        <p className="mt-1 text-xs opacity-60">
                                                                            Se guardará como:{" "}
                                                                            <span className="italic">
                                                                                {it.descripcion_actividad}
                                                                            </span>
                                                                        </p>
                                                                    )}
                                                                </>
                                                            );
                                                        }

                                                        return (
                                                            <>
                                                                <label className="block mb-1 text-xs opacity-80">
                                                                    Descripción actividad
                                                                </label>
                                                                <input
                                                                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                                                    placeholder="Ej: Apoyo administrativo en Mesa de entradas"
                                                                    value={it.descripcion_actividad}
                                                                    onChange={(e) =>
                                                                        setOtrosItems((prev) =>
                                                                            prev.map((row, i) =>
                                                                                i === idx
                                                                                    ? {
                                                                                        ...row,
                                                                                        descripcion_actividad:
                                                                                            e.target.value,
                                                                                    }
                                                                                    : row
                                                                            )
                                                                        )
                                                                    }
                                                                />
                                                            </>
                                                        );
                                                    })()}
                                                    </div>

                                                    <div className="flex justify-end md:col-span-12">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setOtrosItems(
                                                                    (prev) =>
                                                                        prev.filter(
                                                                            (
                                                                                _,
                                                                                i
                                                                            ) =>
                                                                                i !==
                                                                                idx
                                                                        )
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-300 border cursor-pointer rounded-xl border-red-500/60 hover:bg-red-500/10"
                                                            aria-label="Eliminar actividad adicional"
                                                        >
                                                            <FiTrash2
                                                                size={14}
                                                            />
                                                            Quitar
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setOtrosItems((prev) => [
                                                    ...prev,
                                                    {
                                                        id_perfil: "",
                                                        tipo_item: "",
                                                        descripcion_actividad:"",
                                                        cargo: "",
                                                        horas_semanales: "",
                                                        id_carrera: "",
                                                    },
                                                ])
                                            }
                                            className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#19F124] text-[#19F124] hover:bg-[#19F124] hover:text-[#0D1520] cursor-pointer text-sm"
                                        >
                                            + Agregar actividad
                                        </button>
                                    </div>
                                </Field>
                            </section>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <Field label="Período">
                            <select
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                value={form.id_periodo}
                                onChange={(e) =>
                                    onChange("id_periodo", e.target.value)
                                }
                                required
                            >
                                <option value="">Seleccionar…</option>
                                {periodos.map((p) => (
                                    <option
                                        key={p.id_periodo}
                                        value={p.id_periodo}
                                    >
                                        {p.descripcion}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Fecha inicio *">
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                value={form.fecha_inicio}
                                onChange={(e) =>
                                    onChange("fecha_inicio", e.target.value)
                                }
                                required
                            />
                        </Field>

                        <Field label="Fecha fin *">
                            <input
                                type="date"
                                className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-sm"
                                value={form.fecha_fin}
                                onChange={(e) =>
                                    onChange("fecha_fin", e.target.value)
                                }
                                required
                            />
                        </Field>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard/contratos")}
                            className="px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430] cursor-pointer transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <SolidBtn
                            type="submit"
                            disabled={createContratoMutation.isPending}
                            className="inline-flex items-center gap-2 text-sm transition-all disabled:opacity-50"
                        >
                            {createContratoMutation.isPending ? (
                                "Creando..."
                            ) : (
                                <>
                                    <FiSave /> Crear contrato
                                </>
                            )}
                        </SolidBtn>
                    </div>
                </form>
            </Panel>

            <AnimatePresence>
                {overlapError && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setOverlapError(null)}
                            aria-hidden="true"
                        />
                        <motion.div
                            className="relative z-10 w-[92%] max-w-lg bg-[#101922] rounded-2xl p-6 shadow-2xl border border-red-500/40"
                            onClick={(e) => e.stopPropagation()}
                            role="dialog"
                            aria-modal="true"
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            transition={{
                                type: "spring",
                                stiffness: 260,
                                damping: 22,
                            }}
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex items-center justify-center w-10 h-10 text-red-400 rounded-full bg-red-500/10">
                                    <FiAlertCircle size={22} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-red-400">
                                        No se puede crear el contrato
                                    </h2>
                                    <p className="text-xs text-white/70">
                                        El profesor ya tiene un contrato que se
                                        superpone con este rango de fechas.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text:white/80">
                                <p className="opacity-90">
                                    Mensaje del sistema:
                                </p>
                                <p className="px-3 py-2 rounded-lg bg-[#1b2430] border border-red-500/30 text-red-200 text-xs">
                                    {overlapError.message}
                                </p>

                                {(overlapError.fecha_inicio ||
                                    overlapError.fecha_fin) && (
                                    <div className="mt-3 text-xs text-white/75">
                                        <p className="mb-1">
                                            Intentaste crear un contrato con
                                            este período:
                                        </p>
                                        <ul className="ml-4 list-disc">
                                            <li>
                                                <span className="opacity-70">
                                                    Fecha inicio:
                                                </span>{" "}
                                                {overlapError.fecha_inicio ||
                                                    "—"}
                                            </li>
                                            <li>
                                                <span className="opacity-70">
                                                    Fecha fin:
                                                </span>{" "}
                                                {overlapError.fecha_fin || "—"}
                                            </li>
                                        </ul>
                                    </div>
                                )}

                                <p className="mt-3 text-xs text-white/70">
                                    Revisá las fechas de inicio y fin, o
                                    verificá los contratos existentes del
                                    profesor antes de volver a intentar.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 mt-5">
                                <button
                                    type="button"
                                    onClick={() => setOverlapError(null)}
                                    className="px-4 py-2 rounded-xl border border-[#2B3642] hover:bg-[#1A2430] text-sm cursor-pointer transition-all"
                                >
                                    Volver al formulario
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
        
        <AnimatePresence>
                {createContratoMutation.isPending && (
                    <motion.div
                        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-32 h-32"
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
