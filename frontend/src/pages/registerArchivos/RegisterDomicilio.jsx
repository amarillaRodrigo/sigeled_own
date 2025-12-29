import { useEffect, useState } from "react";
import { domOtrosService } from "../../services/api";
import { useToast } from "../../components/ToastProvider";
import { motion } from "motion/react";

export default function RegisterDomicilio({ onSetDomicilio, onNext, onBack }) {
    const [departamentos, setDepartamentos] = useState([]);
    const [localidades, setLocalidades] = useState([]);
    const [id_depto, setIdDepto] = useState("");
    const [id_localidad, setIdLocalidad] = useState("");

    const [barrioNombre, setBarrioNombre] = useState("");
    const [barrioManzana, setBarrioManzana] = useState("");
    const [barrioCasa, setBarrioCasa] = useState("");
    const [barrioDepto, setBarrioDepto] = useState("");
    const [barrioPiso, setBarrioPiso] = useState("");

    const [calle, setCalle] = useState("");
    const [altura, setAltura] = useState("");

    const [loadingDeptos, setLoadingDeptos] = useState(true);
    const [loadingLocs, setLoadingLocs] = useState(false);

    const toast = useToast();

    useEffect(() => {
        (async () => {
        try {
            setLoadingDeptos(true);
            const { data } = await domOtrosService.getDepartamentos();
            setDepartamentos(Array.isArray(data) ? data : []);
        } finally {
            setLoadingDeptos(false);
        }
        })();
    }, []);

    useEffect(() => {
        (async () => {
        setLocalidades([]);
        setIdLocalidad("");
        if (!id_depto) return;
        try {
            setLoadingLocs(true);
            const { data } = await domOtrosService.getLocalidades(id_depto);
            setLocalidades(Array.isArray(data) ? data : []);
        } finally {
            setLoadingLocs(false);
        }
        })();
    }, [id_depto]);

    const canNext =
        calle.trim() !== "" &&
        altura.trim() !== "" &&
        id_localidad &&
        barrioNombre.trim() !== "";

    const confirmar = () => {
        if (!canNext) {
        return toast.success(
            "Completá Departamento, Localidad, Barrio, Calle y Altura."
        );
        }

        const payload = {
        calle: calle.trim(),
        altura: altura.trim(),
        id_dom_barrio: null,
        barrioNuevo: {
            id_dom_localidad: Number(id_localidad),
            barrio: barrioNombre.trim(),
            manzana: barrioManzana || null,
            casa: barrioCasa || null,
            departamento: barrioDepto || null,
            piso: barrioPiso || null,
        },
        };

        onSetDomicilio?.(payload);
        onNext?.();
    };

    return (
        <motion.div
        className="w-full bg-[#101922] rounded-2xl p-6 text-white"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        >
        <h3 className="pt-2 pl-5 pr-5 mb-4 text-3xl font-semibold text.white">
            Completá los datos de tu domicilio
        </h3>

        <div className="pl-5 pr-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
                <label className="block mb-1 text-sm opacity-80">Departamento</label>
                <select
                value={id_depto}
                onChange={(e) => setIdDepto(e.target.value)}
                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                >
                <option value="">
                    {loadingDeptos ? "Cargando…" : "Seleccionar…"}
                </option>
                {departamentos.map((d) => (
                    <option
                    key={d.id_dom_departamento}
                    value={d.id_dom_departamento}
                    >
                    {d.departamento}
                    </option>
                ))}
                </select>
            </div>

            <div>
                <label className="block mb-1 text-sm opacity-80">Localidad *</label>
                <select
                value={id_localidad}
                onChange={(e) => setIdLocalidad(e.target.value)}
                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                disabled={!id_depto}
                >
                <option value="">
                    {loadingLocs ? "Cargando…" : "Seleccionar…"}
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
            </div>

            <div className="grid grid-cols-1 gap-3 mt-3 md:grid-cols-2">
            <div className="md:col-span-2">
                <label className="block mb-1 text-sm opacity-80">Barrio *</label>
                <input
                    value={barrioNombre}
                    onChange={(e) => setBarrioNombre(e.target.value)}
                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                    placeholder="Nombre del barrio"
                />
            </div>
            <div>
                <label className="block mb-1 text-sm opacity-80">Manzana</label>
                <input
                value={barrioManzana}
                onChange={(e) => setBarrioManzana(e.target.value)}
                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                />
            </div>
            <div>
                <label className="block mb-1 text-sm opacity-80">Casa</label>
                <input
                value={barrioCasa}
                onChange={(e) => setBarrioCasa(e.target.value)}
                className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                />
            </div>
            <div>
                <label className="block mb-1 text-sm opacity-80">
                    Departamento (unidad)
                </label>
                <input
                    value={barrioDepto}
                    onChange={(e) => setBarrioDepto(e.target.value)}
                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                />
            </div>
            <div>
                <label className="block mb-1 text-sm opacity-80">Piso</label>
                <input
                    value={barrioPiso}
                    onChange={(e) => setBarrioPiso(e.target.value)}
                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                />
            </div>
            </div>

            <div className="grid grid-cols-1 gap-3 mt-4 md:grid-cols-3">
            <div className="md:col-span-2">
                <label className="block mb-1 text-sm opacity-80">Calle *</label>
                <input
                    value={calle}
                    onChange={(e) => setCalle(e.target.value)}
                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                    placeholder="Ej: Av. Siempre Viva"
                />
            </div>
            <div>
                <label className="block mb-1 text-sm opacity-80">Altura *</label>
                <input
                    value={altura}
                    onChange={(e) => setAltura(e.target.value)}
                    className="w-full px-3 py-2 bg-[#242E38] rounded-xl"
                    placeholder="Ej: 742"
                />
            </div>
            </div>
        </div>

        <div className="flex justify-between mt-6">
            <button
                type="button"
                onClick={() => onBack?.()}
                className="cursor-pointer text-xl rounded-full border hover:bg-[#162a3e] px-6 py-1 transition-all font-black bg-[#0E1F30] text.white border-white/10"
            >
                Atrás
            </button>
            <button
                type="button"
                onClick={confirmar}
                disabled={!canNext}
                className="px-6 py-1 text-xl rounded-full font-bold bg-[#0D1520] text-[#19F124] border-3 border-[#19F124] disabled:opacity-50 cursor-pointer disabled:cursor-default hover:bg-[#19F124] hover:text-[#0D1520] transition-all disabled:pointer-events-none"
            >
                Siguiente
            </button>
        </div>
        </motion.div>
    );
}