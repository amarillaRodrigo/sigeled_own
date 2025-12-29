import { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from "react-router-dom";
import PersonaDocumentos from "../../components/PersonaDocumentos";
import PersonaDomicilios from "../../components/PersonaDomicilios";
import PersonaTitulos from "../../components/PersonaTitulos";
import SegmentedTabs from "../../components/SegmentedTabs";
import { userService, profileService, legajoService, roleService } from "../../services/api";
import { MdNavigateBefore } from "react-icons/md";
import { FiTrash2, FiMail, FiPower, FiLayers, FiHash, FiCalendar, FiCreditCard, FiEdit } from "react-icons/fi";
import { BsPersonVcard } from "react-icons/bs";
import { IoClose } from "react-icons/io5";
import { useAuth } from "../../context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../../components/ToastProvider";
import { useConfirm } from "../../components/ConfirmProvider";
import logoCarga from "../../assets/svg/logoCarga.svg"
import { motion } from "motion/react";

export default function UsuarioDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: me, updateUserPerfiles } = useAuth();
    const queryClient = useQueryClient();

    const toast = useToast();
    const confirm = useConfirm();

    const [showModal, setShowModal] = useState(false);
    const [selectedProfiles, setSelectedProfiles] = useState([]);
    const TABS = { INFO: "info", DOCS: "docs", DOM: "dom", TIT: "tit" };
    const [tab, setTab] = useState(TABS.INFO);
    const [visitedTabs, setVisitedTabs] = useState(new Set([TABS.INFO]));
    const [showNudge, setShowNudge] = useState(false);
    const [openNudge, setOpenNudge] = useState(false);
    const [forzarMismoEstado, setForzarMismoEstado] = useState(false);
    const [showRolesModal, setShowRolesModal] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState([]);

    useEffect(() => {
        setVisitedTabs(prev => {
            const next = new Set(prev);
            next.add(tab);
            return next;
        });
    }, [tab]);

    useEffect(() => {
        setVisitedTabs(new Set([TABS.INFO]));
        setTab(TABS.INFO);
        setShowNudge(false);
        setOpenNudge(false);
    }, [id]);

    const hasVisitedAll = [TABS.INFO, TABS.DOCS, TABS.DOM, TABS.TIT].every(t =>
        visitedTabs.has(t)
    );

    const esAdminRRHH = (me?.roles || []).some(r => {
        const n = (
            typeof r === 'string'
                ? r
                : r?.nombre || r?.codigo || ''
        ).toUpperCase();
        return n === 'ADMIN' || n === 'RRHH' || n === 'RECURSOS HUMANOS';
    });

    const { data: usuario, isLoading: isLoadingUsuario } = useQuery({
        queryKey: ['usuario', id],
        queryFn: () => userService.getUsuarioById(id).then(res => res.data),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: 'always',
        staleTime: 0,
    });

    const { data: legajoEstado } = useQuery({
        queryKey: ['legajo-estado', usuario?.id_persona],
        enabled: !!usuario?.id_persona,
        queryFn: () => legajoService.getEstado(usuario.id_persona).then(r => r.data),
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchOnMount: 'always',
        staleTime: 0,
    });

    const { data: allRoles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: () => roleService.getRoles().then(r => r.data),
        staleTime: 1000 * 60 * 10,
    });

    const { data: userRoles = [] } = useQuery({
        queryKey: ['roles', 'usuario', usuario?.id_usuario],
        enabled: !!usuario?.id_usuario,
        queryFn: () => roleService.getRolesByUser(usuario.id_usuario).then(r => r.data),
    });

    useEffect(() => {
        if (showRolesModal && userRoles) {
            setSelectedRoles(userRoles.map(r => r.id_rol));
        }
    }, [showRolesModal, userRoles]);

    const [activarAhora, setActivarAhora] = useState(false);
    const isSelf = me?.id_persona === usuario?.id_persona;
    const [estadoSeleccionado, setEstadoSeleccionado] = useState('VALIDADO');

    const sameEstado =
        estadoSeleccionado === legajoEstado?.estado?.codigo;
    const noChanges =
        (usuario?.activo || !activarAhora) && sameEstado && !forzarMismoEstado;

    const legajoCodigoActual = String(
        legajoEstado?.estado?.codigo || ''
    ).toUpperCase();

    const shouldShowNudge =
        esAdminRRHH &&
        !isSelf &&
        hasVisitedAll &&
        ['INCOMPLETO', 'PENDIENTE', 'REVISION'].includes(legajoCodigoActual);

    useEffect(() => {
        if (!shouldShowNudge) {
            setShowNudge(false);
            return;
        }
        const t = setTimeout(() => setShowNudge(true), 400);
        return () => clearTimeout(t);
    }, [shouldShowNudge]);

    const { data: todosLosPerfiles = [] } = useQuery({
        queryKey: ['perfiles'],
        queryFn: () => profileService.getProfiles().then(res => res.data),
        staleTime: 1000 * 60 * 60,
    });

    const { data: perfilesVigentes = [] } = useQuery({
        queryKey: ['perfiles', 'asignados', usuario?.id_persona],
        queryFn: () =>
            profileService.getPersonaProfile(usuario.id_persona).then(res => res.data),
        enabled: !!usuario?.id_persona,
    });

    const ESTADOS = [
        { codigo: 'INCOMPLETO', label: 'Legajo incompleto' },
        { codigo: 'PENDIENTE', label: 'Pendiente de verificación' },
        { codigo: 'VALIDADO', label: 'Legajo validado' },
        { codigo: 'BLOQUEADO', label: 'Legajo bloqueado' },
    ];

    useEffect(() => {
        const actual = legajoEstado?.estado?.codigo;
        if (actual) setEstadoSeleccionado(actual);
        setActivarAhora(!usuario?.activo);
    }, [legajoEstado?.estado?.codigo, usuario?.activo]);

    const legajoCodigo = legajoEstado?.estado?.codigo || 'INCOMPLETO';
    const legajoLabel =
        ESTADOS.find(e => e.codigo === legajoCodigo)?.label || legajoCodigo;

    const getLegajoClasses = (codigo) => {
        switch (codigo) {
            case 'VALIDADO':
                return 'bg-green-500/10 border border-green-500/40 text-green-400';
            case 'PENDIENTE':
                return 'bg-yellow-500/15 border border-yellow-500/40 text-yellow-300';
            case 'BLOQUEADO':
                return 'bg-gray-500/15 border border-gray-500/40 text-gray-300';
            case 'INCOMPLETO':
            default:
                return 'bg-red-500/15 border border-red-500/40 text-red-400';
        }
    };

    useEffect(() => {
        if (me?.id_persona === usuario?.id_persona && perfilesVigentes) {
            if (me.perfiles !== perfilesVigentes) {
                updateUserPerfiles(perfilesVigentes);
            }
        }
    }, [
        perfilesVigentes,
        me?.id_persona,
        usuario?.id_persona,
        updateUserPerfiles
    ]);

    const assignProfilesMutation = useMutation({
        mutationFn: (perfilIds) =>
            Promise.all(
                perfilIds.map((pid) =>
                    profileService.assignProfile(usuario.id_persona, pid)
                )
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['perfiles', 'asignados', usuario.id_persona],
            });
            toast.success("Perfiles asignados correctamente");
            setShowModal(false);
            setSelectedProfiles([]);
        },
        onError: (error) => {
            console.error("Error al asignar perfiles:", error);
            toast.error(
                error?.response?.data?.detalle ||
                    error?.response?.data?.message ||
                    "Error al asignar perfiles"
            );
        },
    });

    const deleteProfileMutation = useMutation({
        mutationFn: (id_perfil) =>
            profileService.deleteProfile(usuario.id_persona, id_perfil),
        onSuccess: () => {
            toast.success("Perfil desasignado correctamente");
            queryClient.invalidateQueries({
                queryKey: ['perfiles', 'asignados', usuario.id_persona],
            });
        },
        onError: (error) => {
            console.error("Error al desasignar perfil", error);
            toast.error("No se pudo desasignar el perfil");
        },
    });

    const assignRoleMutation = useMutation({
        mutationFn: ({ id_usuario, ids, asignado_por }) =>
            Promise.all(
                ids.map(id_rol =>
                    roleService.assignRoleToUser(id_usuario, id_rol, asignado_por)
                )
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['roles', 'usuario', usuario.id_usuario],
            });
            queryClient.invalidateQueries({ queryKey: ['usuario', id] });
            toast.success("Rol asignado con éxito.");
        },
        onError: (e) =>
            toast.error(e?.response?.data?.message || 'No se pudo asignar rol'),
    });

    const unassignRoleMutation = useMutation({
        mutationFn: ({ id_usuario, ids }) =>
            Promise.all(
                ids.map(id_rol =>
                    roleService.unassignRoleFromUser(id_usuario, id_rol)
                )
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['roles', 'usuario', usuario.id_usuario],
            });
            queryClient.invalidateQueries({ queryKey: ['usuario', id] });
            toast.success("Rol desasignado con éxito.");
        },
        onError: (e) =>
            toast.error(
                e?.response?.data?.message || 'No se pudo desasignar rol'
            ),
    });

    const handleEliminarPerfil = async (id_perfil, nombre) => {
        try {
            const ok = await confirm({
                title: "Desasignar perfil",
                description: `¿Estás seguro que deseas desasignar el perfil "${nombre}"? Esta acción no se puede deshacer.`,
                confirmtext: "Desasignar",
                tone: "danger",
            });
            if (ok) {
                deleteProfileMutation.mutate(id_perfil);
            }
        } catch (error) {
            console.error("Error al eliminar perfil", error);
            toast.error("Error al eliminar perfil");
        }
    };

    const handleAssignarMultiples = () => {
        if (!usuario || selectedProfiles.length === 0) return;
        assignProfilesMutation.mutate(selectedProfiles);
    };

    const assignedIds = new Set(perfilesVigentes.map((p) => p.id_perfil));

    const toggleSelect = (perfilId) => {
        setSelectedProfiles((prev) =>
            prev.includes(perfilId)
                ? prev.filter((id) => id !== perfilId)
                : [...prev, perfilId]
        );
    };

    const toggleUserMutation = useMutation({
        mutationFn: () => userService.toggleUsuario(id),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['usuario', id] });
            const prev = queryClient.getQueryData(['usuario', id]);
            queryClient.setQueryData(['usuario', id], (u) =>
                u ? { ...u, activo: !u.activo } : u
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['usuario', id], ctx.prev);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['usuario', id] });
            queryClient.invalidateQueries({ queryKey: ['usuarios', 'detalles'] });
        },
    });

    const setEstadoMutation = useMutation({
        mutationFn: (codigo) =>
            legajoService.setEstado(usuario.id_persona, codigo),
        onMutate: async (codigo) => {
            await queryClient.cancelQueries({
                queryKey: ['legajo-estado', usuario.id_persona],
            });
            const prev = queryClient.getQueryData([
                'legajo-estado',
                usuario.id_persona,
            ]);
            queryClient.setQueryData(
                ['legajo-estado', usuario.id_persona],
                (d) =>
                    d
                        ? { ...d, estado: { ...(d.estado || {}), codigo } }
                        : d
            );
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev)
                queryClient.setQueryData(
                    ['legajo-estado', usuario.id_persona],
                    ctx.prev
                );
        },
        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: ['legajo-estado', usuario.id_persona],
            });
            queryClient.invalidateQueries({
                predicate: ({ queryKey }) =>
                    Array.isArray(queryKey) && queryKey.includes('adminStats'),
            });
        },
    });

    const saving =
        toggleUserMutation.isLoading || setEstadoMutation.isLoading;

    const handleConfirm = async () => {
        try {
            const ops = [];
            if (activarAhora && !usuario.activo)
                ops.push(toggleUserMutation.mutateAsync());
            if (estadoSeleccionado && (!sameEstado || forzarMismoEstado)) {
                ops.push(setEstadoMutation.mutateAsync(estadoSeleccionado));
            }
            if (ops.length === 0) {
                setOpenNudge(false);
                return;
            }
            await Promise.all(ops);
            toast.success('Cambios aplicados correctamente');
            setOpenNudge(false);
            setForzarMismoEstado(false);
        } catch (error) {
            console.error(error);
            toast.error('No se pudieron aplicar los cambios');
        }
    };

    const handleSaveRoles = async () => {
        if (!usuario) return;
        const current = new Set((userRoles || []).map(r => r.id_rol));
        const next = new Set(selectedRoles);

        const toAdd = [...next].filter(idr => !current.has(idr));
        const toDel = [...current].filter(idr => !next.has(idr));

        try {
            const ops = [];
            if (toAdd.length)
                ops.push(
                    assignRoleMutation.mutateAsync({
                        id_usuario: usuario.id_usuario,
                        ids: toAdd,
                        asignado_por: me?.id_usuario || me?.id,
                    })
                );
            if (toDel.length)
                ops.push(
                    unassignRoleMutation.mutateAsync({
                        id_usuario: usuario.id_usuario,
                        ids: toDel,
                    })
                );
            await Promise.all(ops);
            toast.success('Roles actualizados con éxito');
            setShowRolesModal(false);
        } catch (error) {
            console.error(error);
            toast.error('No se pudieron actualizar los roles');
        }
    };

    const toggleRoleCheck = (id_rol) => {
        setSelectedRoles(prev =>
            prev.includes(id_rol)
                ? prev.filter(x => x !== id_rol)
                : [...prev, id_rol]
        );
    };

    const handleCloseRoles = () => {
        setShowRolesModal(false);
        setSelectedRoles(userRoles?.map(r => r.id_rol) ?? []);
    };

    if (isLoadingUsuario) {
        return (
            <div className="flex items-center justify-center w-full min-h-screen">
                <motion.img 
                    src={logoCarga} 
                    alt="Cargando..." 
                    className="w-48 h-48"
                    initial={{ opacity: 0, scale: 0.8 }} 
                    animate={{ opacity: 1, scale: 1 }}   
                    transition={{ 
                        duration: 0.5, 
                        ease: [0, 0.71, 0.2, 1.01] 
                    }}
                />
            </div>
        );
    }

    if (!usuario)
        return (
            <div className="text-2xl text-white">
                Error: Usuario no encontrado
            </div>
        );

    return (
        <motion.div
            className="text-white mt-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <motion.div
                className="flex items-center gap-4 ml-16"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
            >
                <motion.button
                    onClick={() => navigate(-1)}
                    className="flex-none shrink-0 p-1 border-2 border-[#19F124] rounded-full hover:bg-[#19F124] cursor-pointer transition"
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <MdNavigateBefore
                        size={35}
                        className="-m-1 hover:text-[#101922] text-[#19F124] transition"
                    />
                </motion.button>

                <div className="flex items-center gap-3">
                    <SegmentedTabs value={tab} onChange={setTab} tabs={TABS} />
                    <motion.div
                        className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-2xl ${getLegajoClasses(
                            legajoCodigo
                        )} transition`}
                        title={`Estado actual: ${legajoLabel}`}
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                    >
                        <span className="text-xs opacity-80">
                            Estado de legajo:
                        </span>
                        <span className="text-sm font-semibold">
                            {legajoLabel}
                        </span>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div
                className="px-10 mt-4"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
            >
                <div className="flex flex-wrap gap-3">
                    <h1 className="text-4xl font-medium">
                        Informacion de{" "}
                        <span className="text-[#19F124] font-black">
                            {usuario.persona?.nombre}{" "}
                            {usuario.persona?.apellido}
                        </span>
                    </h1>
                </div>
            </motion.div>

            {tab === TABS.INFO && (
                <motion.div
                    className="grid grid-cols-1 gap-6 pl-10 pr-10 mt-5 lg:grid-cols-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div className="space-y-5">
                        <motion.section
                            className="bg-[#101922] rounded-2xl p-5 mb-5 text-2xl"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.05 }}
                        >
                            <h2 className="pb-2 pl-2 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                Datos de usuario
                            </h2>

                            <section className="grid grid-cols-2 pl-2 lg:grid-cols-2 gap-y-5 gap-x-8">
                                <div className="flex flex-row items-center gap-3">
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
                                        <span className="text-white">
                                            {usuario.email}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-row items-center gap-3">
                                    <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                        <FiPower
                                            size={30}
                                            className={
                                                usuario.activo
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
                                                usuario.activo
                                                    ? "text-[#19F124] bg-[#173519] rounded-2xl px-4"
                                                    : "text-[#FF5252]"
                                            }
                                        >
                                            {usuario.activo
                                                ? "Activo"
                                                : "Inactivo"}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-row items-center gap-3">
                                    <div className="bg-[#212e3a] border border-[#283746] p-2 rounded-xl">
                                        <FiLayers
                                            className="text-[#FFD54F]"
                                            size={30}
                                        />
                                    </div>
                                    <div className="flex flex-col text-lg">
                                        <span className="text-sm opacity-70">
                                            Rol/es:
                                        </span>
                                        {usuario.roles?.length > 0
                                            ? usuario.roles
                                                    .map((r) => r.nombre)
                                                    .join(", ")
                                                : "Sin rol asignado"}
                                    </div>

                                    <button
                                        onClick={() =>
                                            setShowRolesModal(true)
                                        }
                                        className="ml-auto p-2 rounded-xl border border-[#19F124] text-[#19F124] hover:bg-[#19F124] hover:text-[#0D1520] cursor-pointer transition"
                                        title="Gestionar roles"
                                    >
                                        <FiEdit size={24} />
                                    </button>
                                </div>
                            </section>
                        </motion.section>

                        <motion.section
                            className="bg-[#101922] rounded-2xl p-5 text-2xl"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.08 }}
                        >
                            <h2 className="pb-4 pl-4 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                Datos personales
                            </h2>

                            {usuario.persona && (
                                <section className="grid grid-cols-2 pl-2 lg:grid-cols-2 gap-y-5 gap-x-25">
                                    <div className="flex flex-row items-center gap-3">
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
                                                {usuario.persona.nombre ||
                                                    "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row items-center gap-3">
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
                                                {usuario.persona.apellido ||
                                                    "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-row items-center gap-3">
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
                                                {usuario.persona
                                                    .fecha_nacimiento
                                                    ? new Date(
                                                            usuario.persona
                                                                .fecha_nacimiento
                                                        ).toLocaleDateString()
                                                    : "No especificado"}
                                            </span>
                                        </div>
                                    </div>

                                    {usuario.identificaciones?.[0]?.dni && (
                                        <div className="flex flex-row items-center gap-3">
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
                                        <div className="flex flex-row items-center gap-3">
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
                            )}
                        </motion.section>
                    </div>

                    <div className="space-y-5">
                        <motion.section
                            className="relative bg-[#101922] rounded-2xl p-5 text-2xl"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 }}
                        >
                            <h2 className="pb-4 pl-4 mb-4 text-3xl font-semibold border-b-2 border-[#19f12477] text-[#19F124]">
                                Perfiles del usuario
                            </h2>

                            <div className="space-y-2 text-2xl">
                                {perfilesVigentes.length > 0 ? (
                                    perfilesVigentes.map((p) => (
                                        <motion.div
                                            key={p.id_perfil}
                                            className="flex items-center gap-3 mb-4 font-semibold bg-[#10242a] p-4 border border-[#19f12423] rounded-xl"
                                            initial={{ opacity: 0, y: 4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <span>
                                                <span className="text-[#19F124] mr-2">
                                                    •
                                                </span>{" "}
                                                {p.nombre}
                                            </span>
                                            <button
                                                onClick={() =>
                                                    handleEliminarPerfil(
                                                        p.id_perfil,
                                                        p.nombre
                                                    )
                                                }
                                                className="ml-auto p-2 rounded-lg hover:bg-[#1A2430] text-red-600 hover:text-red-500 transition cursor-pointer"
                                                title="Quitar perfil"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </motion.div>
                                    ))
                                ) : (
                                    <p className="opacity-70">
                                        Sin perfil asignado
                                    </p>
                                )}
                            </div>

                            <motion.button
                                onClick={() => setShowModal(true)}
                                className="mt-4 w-full bg-[#101922] border-2 border-dashed text-[#19F124] py-2 rounded-2xl font-black hover:border-[#19F124] hover:bg-[#19F124] hover:text-[#101922] transition cursor-pointer"
                                whileHover={{ y: -1 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                Asignar perfil +
                            </motion.button>
                        </motion.section>
                    </div>
                </motion.div>
            )}

            {tab === TABS.DOCS && (
                <motion.div
                    className="px-10 mt-6"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <PersonaDocumentos
                        idPersona={usuario.id_persona}
                        asModal={false}
                    />
                </motion.div>
            )}

            {tab === TABS.DOM && (
                <motion.div
                    className="px-10 mt-6"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <PersonaDomicilios
                        idPersona={usuario.id_persona}
                        asModal={false}
                        showPersonaId={esAdminRRHH}
                        canCreate={esAdminRRHH}
                        canDelete={esAdminRRHH}
                        onRequestDelete={(d) =>
                            toast.success(
                                `Solicitud enviada para eliminar domicilio #${d.id_domicilio}`
                            )
                        }
                    />
                </motion.div>
            )}

            {tab === TABS.TIT && (
                <motion.div
                    className="px-10 mt-6"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <PersonaTitulos idPersona={usuario.id_persona} asModal={false} />
                </motion.div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={() => setShowModal(false)}
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="relative z-10 w-[92%] max-w-xl bg-[#101922] rounded-2xl p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-2xl font-semibold text-[#19F124]">
                                Asignar perfiles
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 rounded-lg hover:bg-[#1A2430] cursor-pointer transition"
                                aria-label="Cerrar"
                            >
                                <IoClose size={24} />
                            </button>
                        </div>

                        <div className="max-h-[50vh] overflow-auto pr-1">
                            {todosLosPerfiles.length === 0 && (
                                <p className="opacity-70">
                                    No hay perfiles disponibles.
                                </p>
                            )}

                            <ul className="space-y-2">
                                {todosLosPerfiles.map((p) => {
                                    const disabled = assignedIds.has(
                                        p.id_perfil
                                    );
                                    const checked = selectedProfiles.includes(
                                        p.id_perfil
                                    );
                                    return (
                                        <li
                                            key={p.id_perfil}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
                                                disabled
                                                    ? "opacity-50"
                                                    : "hover:bg-[#1A2430]"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-[#19F124] cursor-pointer"
                                                disabled={disabled}
                                                checked={checked}
                                                onChange={() =>
                                                    toggleSelect(p.id_perfil)
                                                }
                                            />
                                            <span className="text-lg">
                                                {p.nombre}
                                            </span>
                                            {disabled && (
                                                <span className="ml-auto text-xs bg-[#24303C] px-2 py-0.5 rounded-md">
                                                    Ya asignado
                                                </span>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={handleAssignarMultiples}
                                disabled={selectedProfiles.length === 0}
                                className="px-4 py-2 rounded-xl font-bold bg-[#19F124] hover:bg-[#2af935] transition text-[#101922] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Asignar seleccionados
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showRolesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={() => setShowRolesModal(false)}
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2 }}
                    />
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        className="relative z-10 w-[92%] max-w-xl bg-[#101922] rounded-2xl p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-2xl font-semibold text-[#19F124]">
                                Gestionar roles
                            </h3>
                            <button
                                onClick={() => setShowRolesModal(false)}
                                className="p-1 rounded-lg hover:bg-[#1A2430] cursor-pointer transition"
                                aria-label="Cerrar"
                            >
                                <IoClose size={24} />
                            </button>
                        </div>

                        <div className="max-h-[50vh] overflow-auto pr-1">
                            {allRoles.length === 0 && (
                                <p className="opacity-70">
                                    No hay roles disponibles.
                                </p>
                            )}

                            <ul className="space-y-2">
                                {allRoles.map((r) => {
                                    const checked =
                                        selectedRoles.includes(r.id_rol);
                                    return (
                                        <li
                                            key={r.id_rol}
                                            className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-[#1A2430]"
                                        >
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 accent-[#19F124] cursor-pointer"
                                                checked={checked}
                                                onChange={() =>
                                                    toggleRoleCheck(r.id_rol)
                                                }
                                            />
                                            <span className="text-lg">
                                                {r.nombre}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>

                        <div className="flex justify-end gap-3 mt-5">
                            <button
                                onClick={handleSaveRoles}
                                className="px-4 py-2 rounded-xl font-bold bg-[#19F124] hover:bg-[#2af935] transition text-[#101922] cursor-pointer"
                            >
                                Guardar cambios
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            {showNudge &&
                !openNudge &&
                createPortal(
                    <motion.button
                        type="button"
                        aria-label="Activar cuenta y definir estado del legajo"
                        onClick={() => setOpenNudge(true)}
                        className="fixed bottom-6 right-6 text-xl z-9999 px-4 py-3 rounded-full font-black hover:bg-[#19F124] text-[#19F124] border-3 bg-[#030C14] transition cursor-pointer hover:text-[#030C14]"
                        title="Activar cuenta y definir estado del legajo"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.97 }}
                    >
                        ¿Listo para activar y validar?
                    </motion.button>,
                    document.body
                )}

            {openNudge &&
                createPortal(
                    <motion.div
                        className="fixed bottom-6 right-6 z-9999 w-88 max-w-[92vw] rounded-2xl shadow-2xl bg-[#101922] border border-[#1b2a37] p-4"
                        initial={{ opacity: 0, y: 20, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="text-lg font-semibold text-white">
                                Activación y estado de legajo
                            </h3>
                        </div>

                        <div className="space-y-3">
                            {sameEstado && (
                                <label className="flex items-center gap-2 mt-1 text-xs text-white/70">
                                    <input
                                        type="checkbox"
                                        className="accent-[#19F124] w-4 h-4"
                                        checked={forzarMismoEstado}
                                        onChange={(e) =>
                                            setForzarMismoEstado(
                                                e.target.checked
                                            )
                                        }
                                    />
                                    Re-marcar el estado actual (
                                    {estadoSeleccionado})
                                </label>
                            )}

                            <div className="space-y-1">
                                <div className="text-sm text-white/80">
                                    Estado del legajo
                                </div>
                                <select
                                    value={estadoSeleccionado}
                                    onChange={(e) =>
                                        setEstadoSeleccionado(e.target.value)
                                    }
                                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl text-white"
                                >
                                    {ESTADOS.map(op => (
                                        <option
                                            key={op.codigo}
                                            value={op.codigo}
                                        >
                                            {op.label}
                                        </option>
                                    ))}
                                </select>
                                {legajoEstado?.estado?.codigo && (
                                    <div className="text-xs text-white/60">
                                        Actual:{" "}
                                        <span className="font-medium">
                                            {legajoEstado.estado.codigo}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setOpenNudge(false)}
                                    className="cursor-pointer rounded-xl border hover:bg-[#162a3e] px-6 py-1 transition-all font-black bg-[#0E1F30] text-white border-white/10"
                                >
                                    Luego
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirm}
                                    disabled={saving || noChanges}
                                    aria-busy={
                                        saving ? "true" : "false"
                                    }
                                    className="px-3 py-2 rounded-full font-bold bhover:bg-[#19F124] text-[#19F124] border-3 bg-[#101922] transition cursor-pointer hover:text-[#101922] hover:bg-[#19F124] hover:border-[#19F124] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </div>
                    </motion.div>,
                    document.body
                )}
        </motion.div>
    );
}
