import { useState, useEffect } from "react";
import {
    useQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { personaService, identificationService, legajoService, authService} from "../../services/api";
import { FiUser, FiPhone, FiShield} from "react-icons/fi";
import { AiOutlineIdcard } from "react-icons/ai";
import LoadingState from "../../components/LoadingState";
import { useToast } from "../../components/ToastProvider";

const Panel = ({ className = "", ...props }) => (
    <div
        className={`bg-[#0b1420] border border-[#1b2a37] rounded-2xl ${className}`}
        {...props}
    />
);

const InfoRow = ({ label, value }) => (
    <div className="flex justify-between gap-4 py-2 text-base">
        <span className="text-[#9fb2c1]">{label}</span>
        <span className="font-medium text-white text-right wrap-break-word max-w-[65%]">
            {value || "—"}
        </span>
    </div>
);

const Chip = ({ children, className = "" }) => (
    <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-white/15 bg-white/5 ${className}`}
    >
        {children}
    </span>
);

function formatDate(date) {
    if (!date) return null;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString("es-AR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

function getInitials(user, persona) {
    const apellido = persona?.apellido || user?.apellido || "";
    const nombre = persona?.nombre || user?.nombre || "";
    const a = apellido?.[0] || "";
    const n = nombre?.[0] || "";
    const ini = (a + n).trim();
    return ini || "U";
}

function getIdentValue(items, type) {
    if (!Array.isArray(items)) return null;
    const upper = String(type).toUpperCase();

    for (const it of items) {
        if (upper === "DNI") {
            if (it.dni) return it.dni;
            if (it.tipo === "DNI" || it.codigo === "DNI" || it.nombre === "DNI") {
                return it.valor || it.numero || it.dni;
            }
        }
        if (upper === "CUIL") {
            if (it.cuil) return it.cuil;
            if (
                it.tipo === "CUIL" ||
                it.codigo === "CUIL" ||
                it.nombre === "CUIL"
            ) {
                return it.valor || it.numero || it.cuil;
            }
        }
    }
    return null;
}

export default function MiPerfil() {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    const id_persona = user?.id_persona;

    const {
        data: persona,
        isLoading: loadingPersona,
        error: errorPersona,
    } = useQuery({
        queryKey: ["persona", id_persona],
        enabled: !!id_persona,
        queryFn: async () => {
            const { data } = await personaService.getPersonaByID(id_persona);
            return data ?? null;
        },
    });

    const {
        data: identificaciones = [],
    } = useQuery({
        queryKey: ["identificaciones", id_persona],
        enabled: !!id_persona,
        queryFn: async () => {
            const { data } = await identificationService.getIdentificaciones(
                id_persona
            );
            return Array.isArray(data) ? data : [];
        },
    });

    const { data: legajoEstado } = useQuery({
        queryKey: ["legajo", "estado", id_persona],
        enabled: !!id_persona,
        queryFn: async () => {
            const { data } = await legajoService.getEstado(id_persona);
            return data ?? null;
        },
    });

    const dni =
        persona?.dni ||
        user?.dni ||
        getIdentValue(identificaciones, "DNI") ||
        null;

    const cuil =
        persona?.cuil ||
        user?.cuil ||
        getIdentValue(identificaciones, "CUIL") ||
        null;

    const email = user?.email || persona?.email || null;
    const telefono =
        persona?.telefono || persona?.tel || persona?.celular || null;
    const fechaNacimiento =
    formatDate(persona?.fecha_nacimiento || persona?.nacimiento) || null;
    const generoRaw = persona?.genero || persona?.sexo || null;
    const genero =
        typeof generoRaw === "string"
            ? generoRaw
            : typeof generoRaw?.nombre === "string"
            ? generoRaw.nombre
            : typeof generoRaw?.codigo === "string"
            ? generoRaw.codigo
            : null;


    const roles = Array.isArray(user?.roles)
        ? user.roles
            .map((r) => {
                if (!r) return null;
                if (typeof r === "string") return r;
                if (typeof r.nombre === "string") return r.nombre;
                if (typeof r.codigo === "string") return r.codigo;
                return null;
            })
            .filter(Boolean)
    : [];

    const perfiles = Array.isArray(user?.perfiles)
        ? user.perfiles
            .map((p) => {
                if (!p) return null;
                if (typeof p === "string") return p;
                if (typeof p.nombre === "string") return p.nombre;
                if (typeof p.codigo === "string") return p.codigo;
                return null;
            })
            .filter(Boolean)
    : [];

    const normalizeLegajoEstado = (estado) => {
        if (!estado) return { label: null, code: "" };

        const raw = estado.estado ?? estado;

        if (typeof raw === "string") {
            return { label: raw, code: raw.toUpperCase() };
        }

        const label =
            (typeof raw.nombre === "string" && raw.nombre) ||
            (typeof raw.codigo === "string" && raw.codigo) ||
            null;

        const code =
            (typeof raw.codigo === "string" && raw.codigo.toUpperCase()) || "";

        return { label, code };
    };

const { label: legajoLabel, code: legajoCode } = normalizeLegajoEstado(legajoEstado);


    const legajoClasses =
        legajoCode === "COMPLETO"
            ? "bg-green-500/15 border-green-500/40 text-green-300"
            : legajoCode === "INCOMPLETO"
            ? "bg-red-500/15 border-red-500/40 text-red-300"
            : legajoCode === "OBSERVADO"
            ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-300"
            : "bg-gray-500/15 border-gray-500/40 text-gray-200";

    const nombreCompleto = `${persona?.apellido || user?.apellido || ""} ${
        persona?.nombre || user?.nombre || ""
    }`.trim();

    const [isEditing, setIsEditing] = useState(false);
    const [formValues, setFormValues] = useState({
        nombre: "",
        apellido: "",
        fecha_nacimiento: "",
        sexo: "",
        telefono: "",
    });

    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        current_password: "",
        new_password: "",
        confirm_password: "",
    });

    useEffect(() => {
        if (persona) {
            setFormValues({
                nombre: persona.nombre || "",
                apellido: persona.apellido || "",
                fecha_nacimiento: persona.fecha_nacimiento
                    ? String(persona.fecha_nacimiento).slice(0, 10)
                    : "",
                sexo: persona.sexo || "",
                telefono: persona.telefono || "",
            });
        }
    }, [persona]);

    const updatePersonaMutation = useMutation({
        mutationFn: (payload) =>
            personaService
                .updatePersonaBasica(id_persona, payload)
                .then((res) => res.data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["persona", id_persona] });
            setIsEditing(false);
            toast?.success?.("Datos personales actualizados correctamente");
        },
        onError: (error) => {
            const msg =
                error?.response?.data?.message ||
                "Error al actualizar los datos personales";
            toast?.error ? toast.error(msg) : console.error(msg);
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: ({ current_password, new_password }) =>
            authService.changePassword({ current_password, new_password }),
        onSuccess: () => {
            setPasswordForm({
                current_password: "",
                new_password: "",
                confirm_password: "",
            });
            setIsChangingPassword(false);
            toast?.success?.("Contraseña actualizada correctamente");
        },
        onError: (error) => {
            const msg =
                error?.response?.data?.message ||
                "No se pudo actualizar la contraseña";
            toast?.error ? toast.error(msg) : console.error(msg);
        },
    });


    const handleChange = (field, value) => {
        setFormValues((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const payload = {
            nombre: formValues.nombre,
            apellido: formValues.apellido,
            fecha_nacimiento: formValues.fecha_nacimiento || null,
            sexo: formValues.sexo || null,
            telefono: formValues.telefono || null,
        };
        updatePersonaMutation.mutate(payload);
    };

    const handlePasswordFieldChange = (field, value) => {
        setPasswordForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handleSubmitPassword = (e) => {
        e.preventDefault();
        const { current_password, new_password, confirm_password } = passwordForm;

        if (!current_password || !new_password || !confirm_password) {
            toast?.error?.("Completá todos los campos de contraseña");
            return;
        }

        if (new_password.length < 8) {
            toast?.error?.("La nueva contraseña debe tener al menos 8 caracteres");
            return;
        }

        if (new_password !== confirm_password) {
            toast?.error?.("La confirmación no coincide con la nueva contraseña");
            return;
        }

        changePasswordMutation.mutate({ current_password, new_password });
    };


    const loadingTodo = loadingPersona && !persona;

    if (!id_persona) {
        return (
            <motion.div
                className="p-6 space-y-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-white">Mi Perfil</h1>
                <Panel className="w-full max-w-xl p-6 mx-auto text-center">
                    <p className="text-base text-[#9fb2c1]">
                        Tu usuario todavía no tiene datos personales asociados.  
                        Contactá a RRHH o completá tu registro inicial.
                    </p>
                </Panel>
            </motion.div>
        );
    }

    if (loadingTodo) {
        return (
            <motion.div
                className="p-6 space-y-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold text-white">Mi Perfil</h1>
                <Panel className="w-full max-w-xl p-4 mx-auto">
                    <LoadingState
                        classNameContainer="min-h-[200px]"
                        classNameImg="w-20 h-20"
                    />
                </Panel>
            </motion.div>
        );
    }

    return (
        <motion.div
            className="p-6 space-y-6"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            <h1 className="text-3xl font-bold text-white">Mi Perfil</h1>

            <div className="w-full max-w-3xl mx-auto space-y-5">
                <Panel className="p-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-24 h-24 rounded-full bg-[#19F124]/10 flex items-center justify-center text-4xl font-bold text-[#19F124] border border-[#19F124]/80">
                            {getInitials(user, persona)}
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-medium text-[#9fb2c1]">
                                Usuario del sistema
                            </p>
                            <p className="text-2xl font-semibold text-white md:text-3xl">
                                {nombreCompleto || "Sin nombre registrado"}
                            </p>
                            {email && (
                                <p className="text-base text-[#9fb2c1]">
                                    Email de acceso:{" "}
                                    <span className="font-medium text-white">
                                        {email}
                                    </span>
                                </p>
                            )}
                        </div>
                        <div className="flex flex-wrap justify-center gap-2 mt-2">
                            {legajoLabel && (
                                <Chip className={`${legajoClasses} flex items-center gap-1`}>
                                    <FiShield size={14} />
                                    <span className="text-xs">
                                        Estado de legajo: {legajoLabel}
                                    </span>
                                </Chip>
                            )}
                            <Chip className="text-[#9fb2c1] border-[#19F124]/40 bg-[#19F124]/5">
                                <span className="text-xs">
                                    Roles asignados:{" "}
                                    <span className="ml-1 font-semibold text-[#19F124]">
                                        {roles.length}
                                    </span>
                                </span>
                            </Chip>
                            <Chip className="text-[#9fb2c1] border-[#4FC3F7]/40 bg-[#4FC3F7]/5">
                                <span className="text-xs">
                                    Perfiles:{" "}
                                    <span className="ml-1 font-semibold text-[#4FC3F7]">
                                        {perfiles.length}
                                    </span>
                                </span>
                            </Chip>
                            {dni && (
                                <Chip className="text-[#9fb2c1] border-[#FFD54F]/40 bg-[#FFD54F]/5">
                                    <span className="text-xs">
                                        DNI:{" "}
                                        <span className="ml-1 text-white">{dni}</span>
                                    </span>
                                </Chip>
                            )}
                        </div>
                    </div>
                </Panel>

                <Panel className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FiUser className="text-[#19F124]" />
                            <h2 className="text-xl font-semibold text-white">
                                Datos personales
                            </h2>
                        </div>

                        {!loadingPersona && persona && (
                            <button
                                type="button"
                                onClick={() => setIsEditing((v) => !v)}
                                className="px-4 py-1.5 text-sm font-medium text-[#19F124] border border-[#19F124]/60 rounded-full hover:bg-[#19F124]/10 transition-all duration-150 cursor-pointer hover:scale-[1.02]"
                            >
                                {isEditing ? "Cancelar" : "Editar datos"}
                            </button>
                        )}
                    </div>

                    {errorPersona ? (
                        <p className="text-base text-red-400">
                            No se pudieron cargar los datos personales.
                        </p>
                    ) : isEditing ? (
                        <motion.form
                            onSubmit={handleSubmit}
                            className="grid grid-cols-1 gap-4 md:grid-cols-2"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={formValues.nombre}
                                        onChange={(e) =>
                                            handleChange("nombre", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Apellido
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={formValues.apellido}
                                        onChange={(e) =>
                                            handleChange("apellido", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={formValues.telefono}
                                        onChange={(e) =>
                                            handleChange("telefono", e.target.value)
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Fecha de nacimiento
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={formValues.fecha_nacimiento || ""}
                                        onChange={(e) =>
                                            handleChange(
                                                "fecha_nacimiento",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Género
                                    </label>
                                    <select
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={formValues.sexo || ""}
                                        onChange={(e) =>
                                            handleChange("sexo", e.target.value)
                                        }
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="Masculino">Masculino</option>
                                        <option value="Femenino">Femenino</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-1.5 text-sm rounded-full border border-white/15 text-[#9fb2c1] hover:bg-white/5 cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={updatePersonaMutation.isLoading}
                                        className="px-5 py-1.5 text-sm rounded-full bg-[#19F124] text-black font-semibold hover:bg-[#19F124]/90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 hover:scale-[1.03]"
                                    >
                                        {updatePersonaMutation.isLoading
                                            ? "Guardando..."
                                            : "Guardar cambios"}
                                    </button>
                                </div>
                            </div>
                        </motion.form>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                                <InfoRow
                                    label="Nombre"
                                    value={persona?.nombre || user?.nombre || null}
                                />
                                <InfoRow
                                    label="Apellido"
                                    value={persona?.apellido || user?.apellido || null}
                                />
                            </div>

                            <div className="space-y-1">
                                <InfoRow
                                    label="Fecha de nacimiento"
                                    value={fechaNacimiento}
                                />
                                <InfoRow label="Género" value={genero} />
                                <InfoRow label="Teléfono" value={telefono} />
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel className="p-5 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                        <AiOutlineIdcard className="text-[#19F124]" />
                        <h2 className="text-xl font-semibold text-white">
                            Cuenta y acceso
                        </h2>
                    </div>

                    <div className="space-y-1">
                        <InfoRow label="Email de acceso" value={email} />
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="text-base text-[#9fb2c1]">
                            Roles del sistema
                        </div>
                        {roles.length === 0 ? (
                            <p className="text-sm text-[#9fb2c1]">
                                Sin roles asignados.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {roles.map((r, idx) => (
                                    <Chip
                                        key={`rol-${idx}`}
                                        className="border-[#19F124]/50"
                                    >
                                        {r}
                                    </Chip>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="mt-3 space-y-2">
                        <div className="text-base text-[#9fb2c1]">
                            Perfiles funcionales
                        </div>
                        {perfiles.length === 0 ? (
                            <p className="text-sm text-[#9fb2c1]">
                                Sin perfil asignado.
                            </p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {perfiles.map((p, idx) => (
                                    <Chip key={`perf-${idx}`}>{p}</Chip>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <AiOutlineIdcard className="text-[#4FC3F7]" />
                                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                                    Identificación
                                </h3>
                            </div>
                            <InfoRow label="DNI" value={dni} />
                            <InfoRow label="CUIL" value={cuil} />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <FiPhone className="text-[#FFD54F]" />
                                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                                    Contacto
                                </h3>
                            </div>
                            <InfoRow label="Teléfono" value={telefono} />
                            <InfoRow label="Correo electrónico" value={email} />
                        </div>
                    </div>
                    <div className="mt-6 border-t border-[#1b2a37] pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <FiShield className="text-[#19F124]" />
                                <h3 className="text-sm font-semibold tracking-wide text-white uppercase">
                                    Seguridad de la cuenta
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsChangingPassword((v) => !v)}
                                className="px-3 py-1.5 text-xs sm:text-sm rounded-full border border-white/15 text-[#9fb2c1] hover:bg-white/5 cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                            >
                                {isChangingPassword ? "Cerrar" : "Cambiar contraseña"}
                            </button>
                        </div>

                        {isChangingPassword && (
                            <motion.form
                                onSubmit={handleSubmitPassword}
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                            >
                                <div className="flex flex-col gap-1 sm:col-span-2">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Contraseña actual
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={passwordForm.current_password}
                                        onChange={(e) =>
                                            handlePasswordFieldChange("current_password", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Nueva contraseña
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={passwordForm.new_password}
                                        onChange={(e) =>
                                            handlePasswordFieldChange("new_password", e.target.value)
                                        }
                                    />
                                </div>

                                <div className="flex flex-col gap-1">
                                    <label className="text-xs font-semibold text-[#9fb2c1] uppercase tracking-wide">
                                        Confirmar nueva contraseña
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full px-3 py-2 rounded-lg bg-[#0b1420] border border-[#1b2a37] text-base text-white focus:outline-none focus:ring-1 focus:ring-[#19F124]/80 focus:border-[#19F124]/60 transition-all duration-150"
                                        value={passwordForm.confirm_password}
                                        onChange={(e) =>
                                            handlePasswordFieldChange(
                                                "confirm_password",
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordForm({
                                                current_password: "",
                                                new_password: "",
                                                confirm_password: "",
                                            });
                                        }}
                                        className="px-4 py-1.5 text-xs sm:text-sm rounded-full border border-white/15 text-[#9fb2c1] hover:bg-white/5 cursor-pointer transition-all duration-150 hover:scale-[1.02]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={changePasswordMutation.isLoading}
                                        className="px-5 py-1.5 text-xs sm:text-sm rounded-full bg-[#19F124] text-black font-semibold hover:bg-[#19F124]/90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 hover:scale-[1.03]"
                                    >
                                        {changePasswordMutation.isLoading
                                            ? "Guardando..."
                                            : "Actualizar contraseña"}
                                    </button>
                                </div>
                            </motion.form>
                        )}
                    </div>
                </Panel>
            </div>
        </motion.div>
    );
}
