import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { IoClose } from "react-icons/io5";
import { FiTrash2, FiMapPin, FiHome } from "react-icons/fi";
import {
    domicilioService,
    domOtrosService,
    personaBarrioService,
    legajoService,
} from "../services/api";
import RequestDeleteModal from "./SolicitarEliminacionModal";
import { useToast } from "./ToastProvider";
import { useConfirm } from "./ConfirmProvider";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "./LoadingState";

export default function PersonaDomicilios({
    idPersona,
    onClose,
    asModal = true,
    showPersonaId = true,
    canDelete = false,
    canCreate = true,
}) {
    const qc = useQueryClient();

    const toast = useToast();
    const confirm = useConfirm();

    const [showWizard, setShowWizard] = useState(false);
    const [step, setStep] = useState(1);
    const [deletingId, setDeletingId] = useState(null);

    const [calle, setCalle] = useState("");
    const [altura, setAltura] = useState("");

    const [selectedBarrioId, setSelectedBarrioId] = useState("");
    const [showCrearBarrio, setShowCrearBarrio] = useState(false);

    const [id_depto, setIdDepto] = useState("");
    const [id_localidad, setIdLocalidad] = useState("");

    const [barrioNombre, setBarrioNombre] = useState("");
    const [barrioManzana, setBarrioManzana] = useState("");
    const [barrioCasa, setBarrioCasa] = useState("");
    const [barrioDepto, setBarrioDepto] = useState("");
    const [barrioPiso, setBarrioPiso] = useState("");

    const [reqDelDom, setReqDelDom] = useState({ open: false, target: null });
    const [savingDom, setSavingDom] = useState(false);

    const recalcularLegajo = async () => {
        if (!idPersona) return;
        try {
            await qc.invalidateQueries({ queryKey: ["legajo", "estado", idPersona] });
            await legajoService.recalcular(idPersona);
        } catch (e) {
            console.error("No se pudo recalcular legajo:", e);
        }
    };

    const {
        data: domicilios = [],
        isLoading: isLoadingDomicilios,
    } = useQuery({
        queryKey: ["domicilios", idPersona],
        enabled: !!idPersona,
        queryFn: async () => {
            const { data } = await domicilioService.getDomicilioByPersona(idPersona);
            return Array.isArray(data) ? data : [];
        },
    });

    const {
        data: personaBarrios = [],
        refetch: refetchPersonaBarrios,
        isFetching: isFetchingBarrios,
    } = useQuery({
        queryKey: ["personaBarrios", idPersona],
        enabled: !!idPersona && showWizard,
        queryFn: async () => {
            const { data } = await personaBarrioService.getBarrioByPersona(idPersona);
            return Array.isArray(data) ? data : [];
        },
    });

    const { data: departamentos = [] } = useQuery({
        queryKey: ["departamentos"],
        queryFn: async () => {
            const { data } = await domOtrosService.getDepartamentos();
            return data ?? [];
        },
        staleTime: 1000 * 60 * 30,
    });

    const { data: localidades = [] } = useQuery({
        queryKey: ["localidades", id_depto],
        enabled: !!id_depto,
        queryFn: async () => {
            const { data } = await domOtrosService.getLocalidades(id_depto);
            return data ?? [];
        },
    });

    const createBarrioMutation = useMutation({
        mutationFn: async ({ id_localidad, barrio, manzana, casa, departamento, piso }) => {
            const { data } = await domOtrosService.createBarrio(id_localidad, {
                barrio,
                manzana: manzana || null,
                casa: casa || null,
                departamento: departamento || null,
                piso: piso || null,
            });
            return data;
        },
    });

    const assignBarrioMutation = useMutation({
        mutationFn: ({ idPersona, id_dom_barrio }) =>
            personaBarrioService.assignBarrio(idPersona, id_dom_barrio),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: ["personaBarrios", idPersona] }),
    });

    const createDomicilioMutation = useMutation({
        mutationFn: ({ idPersona, payload }) =>
            domicilioService.createDomicilio(idPersona, payload).then((r) => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["domicilios", idPersona] });
            toast.success("Domicilio creado con éxito");
        },
        onError: (error) => {
            console.error("Error al crear domicilio (mutación):", error?.response?.data || error);
            const msg =
            error?.response?.data?.message ||
            error?.response?.data?.detalle ||
            "No se pudo crear el domicilio";
            toast.error(msg);
        },
    });


    const deleteDomicilioMutation = useMutation({
        mutationFn: ({ idPersona, id_domicilio }) =>
            domicilioService.deleteDomicilio(idPersona, id_domicilio),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["domicilios", idPersona] });
            recalcularLegajo();
            toast.success("Domicilio eliminado con éxito");
        },
        onError: (error) => {
            const message =
                error?.response?.data?.message ||
                error?.response?.data?.detalle ||
                "No se pudo eliminar el domicilio";
            toast.error(message);
        },
    });

    const itemsOrdenados = useMemo(
        () =>
            [...(domicilios || [])].sort((a, b) =>
                String(b.id_domicilio).localeCompare(String(a.id_domicilio))
            ),
        [domicilios]
    );

    const resetWizard = () => {
        setStep(1);
        setSelectedBarrioId("");
        setShowCrearBarrio(false);
        setIdDepto("");
        setIdLocalidad("");
        setBarrioNombre("");
        setBarrioManzana("");
        setBarrioCasa("");
        setBarrioDepto("");
        setBarrioPiso("");
        setCalle("");
        setAltura("");
    };

    const openWizard = async () => {
        if (!canCreate) return;
        setShowWizard(true);
        setStep(1);
        setSelectedBarrioId("");
        await refetchPersonaBarrios();
    };

    const handleCrearBarrio = async (e) => {
        e.preventDefault();
        if (!id_localidad) return toast.warning("Seleccioná una localidad primero");
        if (!barrioNombre.trim())
            return toast.warning("Ingresá el nombre del barrio");

        try {
            const nuevo = await createBarrioMutation.mutateAsync({
                id_localidad,
                barrio: barrioNombre,
                manzana: barrioManzana,
                casa: barrioCasa,
                departamento: barrioDepto,
                piso: barrioPiso,
            });

            await assignBarrioMutation.mutateAsync({
                idPersona,
                id_dom_barrio: nuevo.id_dom_barrio,
            });

            setSelectedBarrioId(String(nuevo.id_dom_barrio));
            await refetchPersonaBarrios();

            setBarrioNombre("");
            setBarrioManzana("");
            setBarrioCasa("");
            setBarrioDepto("");
            setBarrioPiso("");
            setShowCrearBarrio(false);
            setIdDepto("");
            setIdLocalidad("");
            toast.success("Barrio creado con éxito");
        } catch (error) {
            console.error("Error al crear/vincular barrio:", error);
            toast.error("No se pudo crear el barrio");
        }
    };

    const handleCreateDomicilio = async (e) => {
        e.preventDefault();
        if (!selectedBarrioId) return toast.warning("Primero seleccioná/creá un barrio");
        if (!calle || !altura) return toast.warning("Completá calle y altura");

        const alturaNum = Number(altura);

        if (!Number.isInteger(alturaNum) || alturaNum <= 0) {
            return toast.warning("La altura debe ser un número positivo");
        }

        try {
            setSavingDom(true);

            await createDomicilioMutation.mutateAsync({
                idPersona,
                payload: {
                    calle: calle.trim(),
                    altura: alturaNum,
                    id_dom_barrio: Number(selectedBarrioId),
                },
            });

            resetWizard();
            setShowWizard(false);
        } catch (error) {
            console.error("Error al crear domicilio:", error);
            const msg =
                error?.response?.data?.message ||
                error?.response?.data?.detalle ||
                "No se pudo crear el domicilio";
            toast.error(msg);
        } finally {
            setSavingDom(false);
        }
    };



    const handleDelete = async (domi) => {
        const ok = await confirm({
            title: "Eliminar domicilio",
            description: `¿Estas seguro que deseas eliminar "${domi.calle ?? "-"} ${
                domi.altura ?? ""
            }"? Esta acción no se puede deshacer.`,
            confirmText: "Eliminar",
            tone: "danger",
        });
        if (!ok) return;

        try {
            setDeletingId(domi.id_domicilio);
            await deleteDomicilioMutation.mutateAsync({
                idPersona,
                id_domicilio: domi.id_domicilio,
            });
        } catch (error) {
            console.error("Error al eliminar el domicilio:", error);
            toast.error("Error al eliminar el domicilio");
        } finally {
            setDeletingId(null);
        }
    };

    const handleAskDelete = (domi) => {
        const label = `${domi.calle ?? "—"} ${domi.altura ?? ""}`.trim();
        setReqDelDom({ open: true, target: { id: domi.id_domicilio, label } });
    };

    const renderPanel = () => (
        <motion.div
            className="w-full p-6 max-w-none rounded-2xl bg-[#101922] shadow-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
        >
            <div className="flex items-start justify-between mb-4">
                <h3 className="text-2xl font-semibold text-[#19F124]">Domicilios</h3>
                {onClose && asModal && (
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-[#1A2430] cursor-pointer"
                    >
                        <IoClose size={22} />
                    </button>
                )}
            </div>

            <div
                className={`flex items-center mb-3 ${
                    canCreate ? "justify-between" : "justify-start"
                }`}
            >
                {showPersonaId && (
                    <p className="text-lg opacity-80 max-w-[70%] truncate">
                        Persona: <span className="font-semibold break-all">{idPersona}</span>
                    </p>
                )}
                {canCreate && (
                    <button
                        onClick={openWizard}
                        className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] hover:bg-[#2af935] text-[#101922] transition"
                    >
                        Agregar domicilio +
                    </button>
                )}
            </div>

            <div className="max-h-[50vh] overflow-auto">
                {isLoadingDomicilios ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <LoadingState
                            classNameContainer="min-h-0"
                            classNameImg="w-30 h-30"
                        />
                    </div>
                ) : itemsOrdenados.length === 0 ? (
                    <div className="flex items-center justify-center min-h-[260px]">
                        <p className="opacity-70">Sin domicilios</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {itemsOrdenados.map((d) => (
                            <motion.div
                                key={d.id_domicilio}
                                layout
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.16 }}
                                className="bg-[#0D1520] p-4 rounded-2xl shadow-md flex flex-col justify-between border border-white/10 hover:border-white/30 transition"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#0f302d] p-3 rounded-xl">
                                            <FiHome size={24} className="text-[#19F124]" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-lg font-semibold">Domicilio</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="text-bg opacity-80">
                                        <p className="flex items-center gap-2 text-lg font-bold">
                                            <FiMapPin className="text-[#19F124]" size={20} />
                                            {d.calle ?? "—"} {d.altura ?? ""}
                                        </p>
                                        <div className="ml-7">
                                            {d.barrio ? `Barrio: ${d.barrio}` : "Sin barrio"} <br />
                                            {d.barrio_manzana ||
                                            d.barrio_casa ||
                                            d.barrio_depto ||
                                            d.barrio_piso
                                                ? " "
                                                : ""}
                                            {d.barrio_manzana ? `Manzana: ${d.barrio_manzana}` : ""}{" "}
                                            <br />
                                            {d.barrio_casa ? ` № Casa: ${d.barrio_casa}` : ""} <br />
                                            {d.barrio_depto
                                                ? ` Departamento: ${d.barrio_depto}`
                                                : ""}{" "}
                                            <br />
                                            {d.barrio_piso ? ` Piso: ${d.barrio_piso}` : ""}
                                        </div>
                                    </div>

                                    <div className="text-bg opacity-60 ml-7">
                                        {d.localidad || d.departamento_admin ? (
                                            <>
                                                {d.localidad ? `${d.localidad}` : ""}
                                                {d.departamento_admin
                                                    ? `, ${d.departamento_admin}`
                                                    : ""}
                                            </>
                                        ) : (
                                            <span>Localidad / departamento no especificado</span>
                                        )}
                                    </div>

                                    <div className="w-full m-auto mt-3 mb-3 border border-white/10" />

                                    <div className="flex justify-end mr-3">
                                        {canDelete ? (
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(d)}
                                                disabled={deletingId === d.id_domicilio}
                                                className="flex items-center cursor-pointer justify-center bg-red-500/5 hover:bg-red-500/20 border border-[#ff2c2c] text-[#ff2c2c] rounded-lg p-2 transition"
                                                title="Eliminar domicilio"
                                                aria-label="Eliminar domicilio"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleAskDelete(d)}
                                                className="flex items-center cursor-pointer justify-center border border-[#19F124]/40 text-[#19F124] rounded-lg px-3 py-1 hover:bg-[#0f302d] transition"
                                                title="Solicitar eliminación"
                                            >
                                                Solicitar eliminación
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence>
                {showWizard && (
                    <motion.div
                        className="fixed inset-0 z-80"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/60"
                            onClick={() => setShowWizard(false)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <motion.div
                                className="w-full max-w-3xl bg-[#101922] rounded-2xl p-6 shadow-xl"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <h4 className="text-xl font-semibold text-[#19F124]">
                                        {step === 1
                                            ? "Paso 1: Seleccioná o creá un barrio"
                                            : "Paso 2: Datos del domicilio"}
                                    </h4>
                                    <button
                                        onClick={() => setShowWizard(false)}
                                        className="p-1 rounded-lg hover:bg-[#1A2430]"
                                    >
                                        <IoClose size={22} />
                                    </button>
                                </div>

                                <div className="flex gap-2 mb-6">
                                    <span
                                        className={`px-2 py-1 rounded-lg text-sm ${
                                            step === 1
                                                ? "bg-[#19F124] text-[#101922]"
                                                : "bg-[#242E38]"
                                        }`}
                                    >
                                        1. Barrio
                                    </span>
                                    <span
                                        className={`px-2 py-1 rounded-lg text-sm ${
                                            step === 2
                                                ? "bg-[#19F124] text-[#101922]"
                                                : "bg-[#242E38]"
                                        }`}
                                    >
                                        2. Domicilio
                                    </span>
                                </div>

                                {step === 1 && (
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <h5 className="font-semibold">
                                                    Barrios vinculados a esta persona
                                                </h5>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setShowCrearBarrio((v) => !v)
                                                    }
                                                    className="text-xs underline text-[#19F124]"
                                                >
                                                    {showCrearBarrio
                                                        ? "Ocultar creación de barrio"
                                                        : "Crear nuevo barrio"}
                                                </button>
                                            </div>

                                            {isFetchingBarrios ? (
                                                <p className="text-sm opacity-70">
                                                    Cargando barrios…
                                                </p>
                                            ) : personaBarrios.length === 0 ? (
                                                <p className="text-sm opacity-70">
                                                    Aún no hay barrios vinculados.
                                                </p>
                                            ) : (
                                                <ul className="space-y-2">
                                                    {personaBarrios.map((b) => (
                                                        <li
                                                            key={b.id_dom_barrio}
                                                            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#0D1520]"
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="barrio_sel"
                                                                checked={
                                                                    String(
                                                                        b.id_dom_barrio
                                                                    ) ===
                                                                    String(selectedBarrioId)
                                                                }
                                                                onChange={() =>
                                                                    setSelectedBarrioId(
                                                                        String(
                                                                            b.id_dom_barrio
                                                                        )
                                                                    )
                                                                }
                                                            />
                                                            <div className="flex-1 text-sm">
                                                                <div className="font-semibold">
                                                                    Barrio: {b.barrio}
                                                                </div>
                                                                <div className="opacity-80">
                                                                    {b.manzana
                                                                        ? `Mz: ${b.manzana} `
                                                                        : ""}
                                                                    {b.casa
                                                                        ? `Casa: ${b.casa} `
                                                                        : ""}
                                                                    {b.departamento
                                                                        ? `Dpto: ${b.departamento} `
                                                                        : ""}
                                                                    {b.piso
                                                                        ? `Piso: ${b.piso} `
                                                                        : ""}
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>

                                        {showCrearBarrio && (
                                            <form
                                                className="grid grid-cols-2 gap-3 mt-3 text-sm"
                                                onSubmit={handleCrearBarrio}
                                            >
                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Departamento
                                                    </label>
                                                    <select
                                                        value={id_depto}
                                                        onChange={(e) =>
                                                            setIdDepto(e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                        required
                                                    >
                                                        <option value="">
                                                            Seleccionar...
                                                        </option>
                                                        {departamentos.map((d) => (
                                                            <option
                                                                key={d.id_dom_departamento}
                                                                value={
                                                                    d.id_dom_departamento
                                                                }
                                                            >
                                                                {d.departamento}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Localidad
                                                    </label>
                                                    <select
                                                        value={id_localidad}
                                                        onChange={(e) =>
                                                            setIdLocalidad(e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                        required
                                                        disabled={!id_depto}
                                                    >
                                                        <option value="">
                                                            Seleccionar...
                                                        </option>
                                                        {localidades.map((l) => (
                                                            <option
                                                                key={l.id_dom_localidad}
                                                                value={l.id_dom_localidad}
                                                            >
                                                                {l.localidad}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="col-span-2">
                                                    <label className="block mb-1 opacity-80">
                                                        Barrio *
                                                    </label>
                                                    <input
                                                        value={barrioNombre}
                                                        onChange={(e) =>
                                                            setBarrioNombre(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                        required
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Manzana
                                                    </label>
                                                    <input
                                                        value={barrioManzana}
                                                        onChange={(e) =>
                                                            setBarrioManzana(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Casa
                                                    </label>
                                                    <input
                                                        value={barrioCasa}
                                                        onChange={(e) =>
                                                            setBarrioCasa(e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Departamento (unidad)
                                                    </label>
                                                    <input
                                                        value={barrioDepto}
                                                        onChange={(e) =>
                                                            setBarrioDepto(
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 opacity-80">
                                                        Piso
                                                    </label>
                                                    <input
                                                        value={barrioPiso}
                                                        onChange={(e) =>
                                                            setBarrioPiso(e.target.value)
                                                        }
                                                        className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    />
                                                </div>

                                                <div className="flex justify-end col-span-2 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setShowCrearBarrio(false)
                                                        }
                                                        className="px-3 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430]"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        className="px-3 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922]"
                                                    >
                                                        Crear y seleccionar
                                                    </button>
                                                </div>
                                            </form>
                                        )}

                                        <div className="flex justify-end gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setShowWizard(false)}
                                                className="px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430]"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!selectedBarrioId}
                                                onClick={() => setStep(2)}
                                                className="px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922] disabled:opacity-50"
                                            >
                                                Continuar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {step === 2 && (
                                    <form
                                        className="space-y-4"
                                        onSubmit={handleCreateDomicilio}
                                    >
                                        <div className="p-3 rounded-xl bg-[#0D1520] text-sm">
                                            <div className="opacity-70">
                                                Barrio seleccionado:
                                            </div>
                                            <div className="font-semibold">
                                                {(() => {
                                                    const sel = personaBarrios.find(
                                                        (b) =>
                                                            String(b.id_dom_barrio) ===
                                                            String(selectedBarrioId)
                                                    );
                                                    return sel ? sel.barrio : selectedBarrioId;
                                                })()}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                            <div className="md:col-span-2">
                                                <label className="block mb-1 text-sm opacity-80">
                                                    Calle
                                                </label>
                                                <input
                                                    value={calle}
                                                    onChange={(e) =>
                                                        setCalle(e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-1 text-sm opacity-80">
                                                    Altura
                                                </label>
                                                <input
                                                    value={altura}
                                                    onChange={(e) =>
                                                        setAltura(e.target.value)
                                                    }
                                                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430]"
                                            >
                                                Volver
                                            </button>
                                            <div className="flex gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        resetWizard();
                                                        setShowWizard(false);
                                                    }}
                                                    className="cursor-pointer px-4 py-2 rounded-xl border-2 border-[#2B3642] hover:bg-[#1A2430]"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="cursor-pointer px-4 py-2 rounded-xl font-bold bg-[#19F124] text-[#101922]"
                                                >
                                                    Guardar domicilio
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );

    const content = renderPanel();

    return (
        <>
            {asModal ? (
                <div className="fixed inset-0 z-70">
                    <motion.div
                        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
                        onClick={onClose}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    />
                    <div
                        className="absolute inset-0 flex items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            className="w-full max-w-4xl"
                            initial={{ opacity: 0, y: 10, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ type: "spring", stiffness: 260, damping: 24 }}
                        >
                            {content}
                        </motion.div>
                    </div>
                </div>
            ) : (
                content
            )}

            <RequestDeleteModal
                open={reqDelDom.open}
                onClose={() => setReqDelDom({ open: false, target: null })}
                kind="domicilio"
                target={reqDelDom.target}
                onSubmit={async ({ motivo }) => {
                    if (!reqDelDom.target?.id) return;
                    await domicilioService.solicitarEliminacion(
                        idPersona,
                        reqDelDom.target.id,
                        { motivo }
                    );
                    await qc.invalidateQueries({
                        queryKey: ["domicilios", idPersona],
                    });
                }}
            />
            <AnimatePresence>
                {savingDom && (
                    <motion.div
                        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingState classNameContainer="min-h-0" classNameImg="w-32 h-32" />
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
