import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import {
  authService,
  identificationService,
  personaService,
} from "../services/api";
import { BiSolidError } from "react-icons/bi";
import { FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../components/LoadingState";
import logo from "../assets/svg/logoLetras.svg";

const STEPS = [
  { id: 1, label: "Cuenta" },
  { id: 2, label: "Datos personales" },
  { id: 3, label: "Identificación" },
];

const Register = () => {
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState({
    email: "",
    password: "",
    confirmarPassword: "",
    nombre: "",
    apellido: "",
    fecha_nacimiento: "",
    sexo: "",
    telefono: "",
    dni: "",
    cuil: "",
    id_usuario: null,
    id_persona: null,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (step < 3) {
        if (step === 1 && userData.password !== userData.confirmarPassword) {
          setError("Las contraseñas no coinciden");
          return;
        }
        setStep((prev) => prev + 1);
        return;
      }

      setSubmitting(true);

      const payload = {
        email: userData.email,
        password: userData.password,
        nombre: userData.nombre,
        apellido: userData.apellido,
        fecha_nacimiento: userData.fecha_nacimiento,
        sexo: userData.sexo,
        telefono: userData.telefono,
        dni: userData.dni,
        cuil: userData.cuil,
      };

      const res = await authService.registerFull(payload);
      await login(res.data.user, res.data.token);
      const idp = res?.data?.user?.id_persona;
      navigate(`/registro/archivos?persona=${idp}`);
    } catch (error) {
      setError(error.response?.data?.message || "Error en el registro");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <>
            <input
              id="email"
              name="email"
              type="email"
              value={userData.email}
              onChange={handleChange}
              required
              placeholder="Email"
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              autoComplete="email"
            />
            <input
              id="password"
              name="password"
              type="password"
              value={userData.password}
              onChange={handleChange}
              required
              placeholder="Contraseña"
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              autoComplete="new-password"
            />
            <input
              id="confirmarPassword"
              name="confirmarPassword"
              type="password"
              value={userData.confirmarPassword}
              onChange={handleChange}
              required
              placeholder="Confirmar contraseña"
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              autoComplete="new-password"
            />
          </>
        );

      case 2:
        return (
          <>
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={userData.nombre}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
            <input
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={userData.apellido}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
            <input
              type="date"
              name="fecha_nacimiento"
              value={userData.fecha_nacimiento}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
            <select
              name="sexo"
              value={userData.sexo}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            >
              <option value="">Seleccionar sexo</option>
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
              <option value="Otro">Otro</option>
            </select>
            <input
              type="text"
              name="telefono"
              value={userData.telefono}
              onChange={handleChange}
              placeholder="Teléfono"
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
          </>
        );

      case 3:
        return (
          <>
            <input
              type="text"
              name="dni"
              placeholder="DNI"
              value={userData.dni}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
            <input
              type="text"
              name="cuil"
              placeholder="CUIL"
              value={userData.cuil}
              onChange={handleChange}
              className="w-full h-14 px-5 bg-[#0E1F30] text-white placeholder-white/50 rounded-xl text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
              required
            />
          </>
        );
      default:
        return null;
    }
  };

  const renderStepper = () => {
    return (
      <motion.div
        className="w-full mb-8"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between gap-4">
          {STEPS.map((s, index) => {
            const status =
              s.id < step ? "done" : s.id === step ? "current" : "upcoming";

            const circleClasses =
              status === "done"
                ? "bg-[#19F124] text-[#020c14] border-[#19F124]"
                : status === "current"
                ? "bg-[#19F124] text-[#030C14] border-[#19F124]"
                : "bg-[#0E1F30] text-white border-[#0E1F30]";

            const isLineActive = step > s.id;
            const lineClasses =
              isLineActive ? "bg-[#19F124]" : "bg-white/15";

            return (
              <div
                key={s.id}
                className="flex items-center flex-1 min-w-0 gap-2 ml-5"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-bold transition-colors ${circleClasses}`}
                  >
                    {status === "done" ? (
                      <FiCheck className="w-4 h-4" />
                    ) : (
                      s.id
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[0.7rem] uppercase tracking-wide text-white/40">
                      Paso {s.id}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      {s.label}
                    </span>
                  </div>
                </div>

                {index < STEPS.length - 1  && (
                  <div className="flex-1 hidden sm:block">
                    <div
                      className={`h-1 rounded-full transition-colors ${lineClasses}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <motion.div
        className="min-h-screen w-screen bg-[#030C14]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="grid w-full min-h-screen grid-cols-1 md:grid-cols-2">
          <motion.div
            className="bg-[#0C1A27] rounded-2xl m-5 flex items-center justify-center"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24 }}
          >
            <img src={logo} alt="SIGELED" className="max-h-[70vh] w-auto" />
          </motion.div>

          <motion.div
            className="flex flex-col justify-center p-8 md:pl-20 md:pr-20"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24 }}
          >
            <h1 className="text-4xl md:text-5xl font-semibold text-start text-[#19F124] mb-6">
              Registro de Usuario
            </h1>
            {renderStepper()}


            <form onSubmit={handleSubmit} className="space-y-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.div
                  className="p-3 mb-4 text-[1.7rem] text-[#0a0000] font-semibold rounded-xl bg-[#f48383] flex flex-row items-center"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <BiSolidError className="w-9 h-9 mr-2 text-[#0a0000] font-black" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="w-full h-16 rounded-full text-4xl font-black leading-none bg-transparent text-[#19F124] border-[3px] border-[#19F124] hover:bg-[#19F124] hover:text-[#020c14] cursor-pointer transition-colors mt-2"
                disabled={submitting}
              >
                {step < 3 ? "Siguiente" : submitting ? "Registrando..." : "Finalizar"}
              </button>

              <div className="flex justify-between mt-4">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => prev - 1)}
                    className="text-lg text-white underline"
                    disabled={submitting}
                  >
                    Atrás
                  </button>
                )}
                <span className="text-xl text-white/80">
                  ¿Ya tenés una cuenta?{" "}
                  <Link
                    to="/login"
                    className="text-[#19F124] font-semibold hover:underline"
                  >
                    Iniciar Sesión
                  </Link>
                </span>
              </div>
            </form>
          </motion.div>
        </div>
      </motion.div>

      <AnimatePresence>
        {submitting && (
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
};

export default Register;