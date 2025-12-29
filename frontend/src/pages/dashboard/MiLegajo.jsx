import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    FiMail,
    FiPower,
    FiLayers,
    FiHash,
    FiCalendar,
    FiCreditCard,
} from "react-icons/fi";
import { BsPersonVcard } from "react-icons/bs";
import SegmentedTabs from "../../components/SegmentedTabs";
import PersonaDocumentos from "../../components/PersonaDocumentos";
import PersonaDomicilios from "../../components/PersonaDomicilios";
import PersonaTitulos from "../../components/PersonaTitulos";
import {
    personaService,
    identificationService,
    profileService,
    legajoService,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ToastProvider";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../../components/LoadingState";

const TABS = { INFO: "info", DOCS: "docs", DOM: "dom", TIT: "tit" };

const ROLE_NAME = {
    ADMIN: "Administrador",
    RRHH: "Recursos Humanos",
    ADMITVO: "Administrativo",   
    ADMTVO: "Administrativo",
    EMP: "Empleado",
    USER: "Usuario",
};

const PERFIL_NAME = {
    PROF: "Profesor",
    COOR: "Coordinador",
    ADMITVO: "Administrativo",
    RRHH: "Recursos Humanos",
    INVEST: "Investigador",
};

const ESTADOS_LEGAJO = [
    { codigo: "INCOMPLETO", label: "Legajo incompleto" },
    { codigo: "PENDIENTE", label: "Pendiente de verificación" },
    { codigo: "REVISION", label: "En revisión" },
    { codigo: "VALIDADO", label: "Legajo validado" },
    { codigo: "BLOQUEADO", label: "Legajo bloqueado" },
];

const getLegajoClasses = (codigo) => {
    switch (codigo) {
        case "VALIDADO":
            return "bg-green-500/10 border border-green-500/40 text-green-400";
        case "PENDIENTE":
            return "bg-yellow-500/15 border border-yellow-500/40 text-yellow-300";
        case "BLOQUEADO":
            return "bg-gray-500/15 border border-gray-500/40 text-gray-300";
        case "INCOMPLETO":
        default:
            return "bg-red-500/15 border border-red-500/40 text-red-400";
    }
};

export default function MiLegajo() {
    const { user: me } = useAuth();
    const [tab, setTab] = useState(TABS.INFO);
    const toast = useToast();

    const myPersonId = useMemo(
        () => me?.id_persona ?? me?.persona?.id_persona ?? null,
        [me]
    );

    const codeToName = (code) => {
        const C = String(code || "").toUpperCase();
        const map = {
            ADMIN: "Administrador",
            RRHH: "Recursos Humanos",
            "RECURSOS HUMANOS": "Recursos Humanos",
            USER: "Usuario",
            ADMITVO: "Administrativo",
            ADMTVO: "Administrativo",
        };
        return map[C] || (C.charAt(0) + C.slice(1).toLowerCase());
    };

    const normalizeRoles = (arr) => {
        if (!Array.isArray(arr)) return [];
        return arr.map((r) =>
            typeof r === "string"
                ? { codigo: r, nombre: codeToName(r) }
                : {
                    codigo: r?.codigo ?? r?.nombre ?? "",
                    nombre: r?.nombre ?? r?.codigo ?? "",
                }
        );
    };

    const displayRoleName = (r) => {
        const code = String(r?.codigo ?? r ?? "").toUpperCase();
        return ROLE_NAME[code] ?? codeToName(code);
    };

    const hasRole = (u, names = []) => {
        if (!u?.roles) return false;
        const targets = new Set(names.map((n) => String(n).toUpperCase()));
        return u.roles.some((r) => {
            const code = String(
                typeof r === "string" ? r : r?.codigo ?? ""
            ).toUpperCase();
            const name = String(
                typeof r === "string" ? r : r?.nombre ?? ""
            ).toUpperCase();
            return targets.has(code) || targets.has(name);
        });
    };

    const {
        data: personaData,
        isLoading: loadingPersona,
    } = useQuery({
        queryKey: ["persona", myPersonId],
        enabled: !!myPersonId,
        queryFn: async () => {
            const { data } = await personaService.getPersonaByID(myPersonId);
            return data ?? null;
        },
    });

    const {
        data: identData = [],
        isLoading: loadingIdent,
    } = useQuery({
        queryKey: ["identificaciones", myPersonId],
        enabled: !!myPersonId,
        queryFn: async () => {
            const { data } = await identificationService.getIdentificaciones(
                myPersonId
            );
            return Array.isArray(data) ? data : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const {
        data: perfilesData = [],
        isLoading: loadingPerfiles,
    } = useQuery({
        queryKey: ["perfiles", myPersonId],
        enabled: !!myPersonId,
        queryFn: async () => {
            const { data } = await profileService.getPersonaProfile(myPersonId);
            return Array.isArray(data) ? data : [];
        },
        staleTime: 5 * 60 * 1000,
    });

    const {
        data: legajoInfo,
        isLoading: loadingLegajo,
    } = useQuery({
        queryKey: ["legajo", "estado", myPersonId],
        enabled: !!myPersonId,
        queryFn: async () => {
            const { data } = await legajoService.getEstado(myPersonId);

            const codigo =
                data?.estado?.codigo ||
                data?.codigo ||
                data?.estado_codigo ||
                "INCOMPLETO";

            const nombreBase =
                data?.estado?.nombre ||
                data?.nombre ||
                data?.estado_nombre ||
                codigo;

            const nombreMap = {
                INCOMPLETO: "Legajo incompleto",
                PENDIENTE: "Pendiente de verificación",
                REVISION: "En revisión",
                VALIDADO: "Legajo validado",
                BLOQUEADO: "Legajo bloqueado",
            };

            const nombre = nombreMap[codigo] || nombreBase;

            const checklist = data?.checklist || data?.estado?.checklist || {};

            const flags = [
                checklist.okPersona,
                checklist.okIdent,
                checklist.okDocs,
                checklist.okDomicilio,
                checklist.okTitulos,
            ].filter((v) => typeof v === "boolean");
            const total = flags.length;
            const cumplidos = flags.filter(Boolean).length;
            const porcentaje = total ? Math.round((cumplidos / total) * 100) : 0;

            return { codigo, nombre, checklist, porcentaje };
        },
        staleTime: 5 * 60 * 1000,
    });

    const identificaciones = useMemo(() => {
        if (!Array.isArray(identData)) return [];

        const first = identData[0];
        if (first && (first.dni || first.cuil)) {
            return [
                {
                    dni: first.dni ?? null,
                    cuil: first.cuil ?? null,
                },
            ];
        }

        const byTipo = {};
        for (const it of identData) {
            const tipo = (it?.tipo ?? it?.Tipo ?? "")
                .toString()
                .toUpperCase();
            const numero =
                it?.numero ??
                it?.Numero ??
                it?.valor ??
                it?.dni ??
                it?.cuil ??
                null;

            if (tipo && numero) byTipo[tipo] = numero;
        }

        const dni =
            byTipo.DNI ??
            identData.find((x) =>
                /DNI/i.test(String(x?.tipo ?? x?.Tipo ?? ""))
            )?.numero ??
            identData.find((x) => x?.dni)?.dni ??
            null;

        const cuil =
            byTipo.CUIL ??
            identData.find((x) =>
                /CUIL/i.test(String(x?.tipo ?? x?.Tipo ?? ""))
            )?.numero ??
            identData.find((x) => x?.cuil)?.cuil ??
            null;

        return [{ dni, cuil }];
    }, [identData]);

    const roles = normalizeRoles(me?.roles || []);
    const persona = personaData ?? me?.persona ?? null;

    const usuario = useMemo(
        () => ({
            ...me,
            id_persona:
                me?.id_persona ?? persona?.id_persona ?? myPersonId ?? null,
            persona,
            identificaciones,
            perfiles: perfilesData,
            roles,
        }),
        [me, persona, myPersonId, identificaciones, perfilesData, roles]
    );

    const isAdminOrRRHH = hasRole(usuario ?? me, [
        "ADMIN",
        "RRHH",
        "RECURSOS HUMANOS",
    ]);
    const isActive =
        typeof usuario?.activo === "boolean" ? usuario.activo : true;

    const loadingAll =
        !!myPersonId &&
        (((loadingPersona || loadingIdent || loadingPerfiles) &&
            !usuario?.persona) ||
            (loadingLegajo && !legajoInfo));

    if (loadingAll) {
        return (
            <div className="">
                <LoadingState />
            </div>
        );
    }

    const personaView =
        usuario.persona ?? {
            nombre: me?.nombre,
            apellido: me?.apellido,
            fecha_nacimiento: me?.fecha_nacimiento,
        };

    const legajoCodigo = String(
        legajoInfo?.codigo || "INCOMPLETO"
    ).toUpperCase();
    const legajoLabel =
        legajoInfo?.nombre ||
        ESTADOS_LEGAJO.find((e) => e.codigo === legajoCodigo)?.label ||
        legajoCodigo;

    const displayPerfilName = (p) => {
        const code = String(
            p?.codigo ?? p?.perfil_codigo ?? ""
        ).toUpperCase();
        const baseNombre = p?.nombre ?? p?.perfil_nombre ?? "";
        const mapped = PERFIL_NAME[code];
        return mapped || baseNombre || code || "Perfil sin nombre";
    };

    return (
        <motion.div
            className="text-white mt-7"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
        >
            <motion.div
                className="flex items-center gap-4 px-10"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.05 }}
            >
                <SegmentedTabs value={tab} onChange={setTab} tabs={TABS} />
                <div
                    className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl ${getLegajoClasses(
                        legajoCodigo
                    )} transition`}
                    title={`Estado actual: ${legajoLabel}`}
                >
                    <span className="text-xs opacity-80">
                        Estado de legajo:
                    </span>
                    <span className="text-sm font-semibold">
                        {legajoLabel}
                    </span>
                </div>
            </motion.div>

            <motion.div
                className="px-10 mt-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
            >
                <h1 className="text-4xl font-medium">
                    Mi Legajo —{" "}
                    <span className="text-[#19F124] font-black">
                        {personaView?.nombre ?? ""}{" "}
                        {personaView?.apellido ?? ""}
                    </span>
                </h1>
            </motion.div>

            <AnimatePresence mode="wait">
                {tab === TABS.INFO && (
                    <motion.div
                        key="info"
                        className="grid grid-cols-1 gap-6 px-10 mt-5 lg:grid-cols-2"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="space-y-5">
                            <section className="bg-[#101922] rounded-2xl p-5 mb-5 text-2xl">
                                <h2 className="pb-2 pl-2 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                    Datos de usuario
                                </h2>
                                <section className="grid grid-cols-2 pl-2 gap-y-5 gap-x-25">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiMail
                                                className="text-[#4FC3F7]"
                                                size={30}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Email
                                            </span>
                                            <span className="text-bg">
                                                {usuario.email ?? me?.email}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiPower
                                                size={30}
                                                className={
                                                    isActive
                                                        ? "text-[#19F124]"
                                                        : "text-[#FF5252]"
                                                }
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Estado
                                            </span>
                                            <span
                                                className={
                                                    isActive
                                                        ? "text-[#19F124] bg-[#173519] rounded-2xl px-4"
                                                        : "text-[#FF5252]"
                                                }
                                            >
                                                {isActive
                                                    ? "Activo"
                                                    : "Inactivo"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiLayers
                                                className="text-[#FFD54F]"
                                                size={30}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Rol/es
                                            </span>
                                            <span>
                                                {usuario.roles?.length
                                                    ? usuario.roles
                                                        .map(
                                                            displayRoleName
                                                        )
                                                        .join(", ")
                                                    : "Sin asignar"}
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </section>

                            <section className="bg-[#101922] rounded-2xl p-5 text-2xl">
                                <h2 className="pb-4 pl-4 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                    Datos personales
                                </h2>

                                <section className="grid grid-cols-2 pl-2 gap-y-5 gap-x-25">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiHash
                                                className="text-[#64B5F6]"
                                                size={30}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Nombre
                                            </span>
                                            <span>
                                                {personaView?.nombre ||
                                                    "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiHash
                                                className="text-[#BA68C8]"
                                                size={30}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Apellido
                                            </span>
                                            <span>
                                                {personaView?.apellido ||
                                                    "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                            <FiCalendar
                                                className="text-[#FFB74D]"
                                                size={30}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm opacity-70">
                                                Fecha de Nacimiento
                                            </span>
                                            <span>
                                                {personaView?.fecha_nacimiento
                                                    ? new Date(
                                                            personaView.fecha_nacimiento
                                                        ).toLocaleDateString()
                                                    : "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    {usuario.identificaciones?.[0]?.dni && (
                                        <div className="flex items-center gap-3">
                                            <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                                <FiCreditCard
                                                    className="text-[#90CAF9]"
                                                    size={30}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm opacity-70">
                                                    DNI
                                                </span>
                                                <span>
                                                    {
                                                        usuario
                                                            .identificaciones[0]
                                                            .dni
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {usuario.identificaciones?.[0]?.cuil && (
                                        <div className="flex items-center gap-3">
                                            <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                                <BsPersonVcard
                                                    className="text-[#81C784]"
                                                    size={30}
                                                />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm opacity-70">
                                                    CUIL
                                                </span>
                                                <span>
                                                    {
                                                        usuario
                                                            .identificaciones[0]
                                                            .cuil
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </section>
                        </div>

                        <div className="space-y-5">
                            <section className="relative bg-[#101922] rounded-2xl p-5 text-2xl">
                                <h2 className="pb-4 pl-4 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                    Mis perfiles
                                </h2>

                                <div className="space-y-2 text-2xl">
                                    {usuario.perfiles?.length ? (
                                        usuario.perfiles.map((p) => {
                                            const code = String(
                                                p?.codigo ??
                                                    p?.perfil_codigo ??
                                                    ""
                                            ).toUpperCase();
                                            return (
                                                <div
                                                    key={
                                                        p.id_perfil ??
                                                        p.nombre ??
                                                        code
                                                    }
                                                    className="flex items-center gap-3 mb-4 font-semibold bg-[#10242a] p-4 border border-[#19f12423] rounded-xl"
                                                >
                                                    <span className="text-[#19F124] mr-2">
                                                        •
                                                    </span>
                                                    <span>
                                                        {displayPerfilName(p)}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="opacity-70">
                                            Sin perfiles asignados
                                        </p>
                                    )}
                                </div>
                            </section>
                        </div>
                    </motion.div>
                )}

                {tab === TABS.DOCS && (
                    <motion.div
                        key="docs"
                        className="px-10 mt-6"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <PersonaDocumentos
                            idPersona={usuario.id_persona ?? me?.id_persona}
                            asModal={false}
                            showPersonaId={false}
                            canDelete={isAdminOrRRHH}
                            canChangeState={isAdminOrRRHH}
                            onRequestDelete={async () => {
                                toast.success(
                                    "Solicitud enviada para eliminar el documento. RRHH revisará tu pedido."
                                );
                            }}
                        />
                    </motion.div>
                )}

                {tab === TABS.DOM && (
                    <motion.div
                        key="dom"
                        className="px-10 mt-6"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <PersonaDomicilios
                            idPersona={usuario.id_persona ?? me?.id_persona}
                            asModal={false}
                            showPersonaId={false}
                            canDelete={isAdminOrRRHH}
                            canCreate={true}
                            onRequestDelete={(dom) =>
                                toast.success(
                                    `Solicitud enviada para eliminar: ${dom.calle} ${dom.altura}`
                                )
                            }
                        />
                    </motion.div>
                )}

                {tab === TABS.TIT && (
                    <motion.div
                        key="tit"
                        className="px-10 mt-6"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <PersonaTitulos
                            idPersona={usuario.id_persona ?? me?.id_persona}
                            asModal={false}
                            showPersonaId={false}
                            canDelete={isAdminOrRRHH}
                            canChangeState={isAdminOrRRHH}
                            onRequestDelete={async () => {
                                toast.success(
                                    "Solicitud enviada para eliminar el título. RRHH revisará tu pedido."
                                );
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
