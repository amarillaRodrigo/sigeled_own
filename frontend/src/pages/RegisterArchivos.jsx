import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StepDocs from "./registerArchivos/StepDocs";
import RegisterDomicilio from "./registerArchivos/RegisterDomicilio";
import RegisterTitulo from "./registerArchivos/RegisterTitulo";
import { personaBarrioService, domicilioService, tituloService, legajoService, personaDocService, domOtrosService } from "../services/api";
import { useToast } from "../components/ToastProvider";

const extractQuery = (s, k) => new URLSearchParams(s).get(k);

const Stepper = ({ step }) => {
    const steps = [
        { n: 1, label: "Documentos" },
        { n: 2, label: "Domicilio" },
        { n: 3, label: "Títulos" },
    ];
    return (
        <div className="flex items-center gap-6">
        {steps.map((s, i) => (
            <div key={s.n} className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full flex items-center text-2xl justify-center font-black
                ${step >= s.n ? 'bg-[#19F124] text-[#05200a]' : 'bg-[#13202c] text-white/80'}`}>
                {s.n}
            </div>
            {/* <span className={`hidden sm:block ${step >= s.n ? 'text-white' : 'text-white/60'}`}>{s.label}</span> */}
            <span className={`hidden sm:block ${step >= s.n ? 'text-white' : 'text-white/60'}`}></span>
            {i < steps.length - 1 && (
                <div className={`w-30 h-1 rounded transition-all ${step > s.n ? 'bg-[#19F124]' : 'bg-white/10'}`} />
            )}
            </div>
        ))}
        </div>
    );
};

const stepsTitle = { 
            1: "Subí tus documentos personales",
            2: "Cargá tu domicilio",
            3: "Cargá tus títulos",
        }

export default function RegisterArchivos() {
    const navigate = useNavigate();
    const q = useLocation().search;
    const id_persona = extractQuery(q, "persona");
    const toast = useToast();

    const [step, setStep] = useState(1);
    const [domPayload, setDomPayload] = useState(null);

    const [tituloDraft, setTituloDraft] = useState(null);

    const [docs, setDocs] = useState([]);
    const [saving, setSaving] = useState(false);

    const refetchDocs = async () => {
        if (!id_persona) return;
        const { data } = await personaDocService.listarDocumentos(id_persona);
        setDocs(Array.isArray(data) ? data : []);
    };

    useEffect(() => { if (id_persona) refetchDocs(); }, [id_persona]);

    const uploadedCodes = useMemo(
        () => (Array.isArray(docs) ? docs.map(d => d.tipo_codigo).filter(Boolean) : []),
        [docs]
    );

    const finalizar = async () => {
        if (!id_persona) return toast.warning("Falta id_persona");
        try {
        setSaving(true);

        if (domPayload) {
            const { id_dom_barrio, barrioNuevo, calle, altura } = domPayload;
            let barrioId = id_dom_barrio || null;

            if (!barrioId && barrioNuevo) {
            const { id_dom_localidad, barrio, manzana, casa, departamento, piso } = barrioNuevo;
            const { data: barrioCreado } = await domOtrosService.createBarrio(id_dom_localidad, {
                barrio, manzana, casa, departamento, piso
            });
            barrioId = barrioCreado.id_dom_barrio;
            }

            if (barrioId) await personaBarrioService.assignBarrio(id_persona, barrioId);
            await domicilioService.createDomicilio(id_persona, { calle, altura, id_dom_barrio: barrioId });
        }

        if (tituloDraft && tituloDraft.id_tipo_titulo && tituloDraft.nombre_titulo) {
            await tituloService.createTitulo({ id_persona, ...tituloDraft });
        }

        try {
            await legajoService.recalcular(id_persona);
        } catch {}

        navigate("/revision", { replace: true });
        } catch (e) {
        console.error(e);
        toast.error(e?.response?.data?.detalle || e?.response?.data?.error || "No se pudo finalizar el registro");
        } finally {
        setSaving(false);
        }
    };

    return (
        <div className="min-h-screen w-[50%] m-auto text-white p-6 space-y-6 flex flex-col justify-center">
        <div className="flex flex-col items-center gap-3 align-middle">
            <div>
                <h1 className="text-[2.5rem] font-semibold text-[#19F124]">{stepsTitle[step] || "Completar registro"}</h1>
            </div>
            <Stepper step={step} />
        </div>

        {step === 1 && (
            <StepDocs
            idPersona={id_persona}
            alreadyUploadedCodes={uploadedCodes}
            uploadedDocs={docs}
            onUploaded={refetchDocs}
            onNext={() => setStep(2)}
            />
        )}

        {step === 2 && (
            <RegisterDomicilio
            onSetDomicilio={setDomPayload}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
            />
        )}

        {step === 3 && (
            <RegisterTitulo
            idPersona={id_persona}
            onBack={() => setStep(2)}
            onFinish={finalizar}
            onDraftChange={setTituloDraft}  
            saving={saving}
            />
        )}
        </div>
    );
}
