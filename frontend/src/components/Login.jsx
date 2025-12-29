import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/svg/logoLetras.svg";
import { BiSolidError } from "react-icons/bi";
import { motion, AnimatePresence } from "motion/react";
import LoadingState from "../components/LoadingState";

export default function Login() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) =>
    setCredentials({ ...credentials, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { data } = await authService.login(credentials);
      const isActive = data?.user?.activo === true;
      if (!isActive) {
        logout();
        return navigate("/revision", { replace: true });
      }
      await login(data.user, data.token);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err.response?.status === 403) {
        logout();
        navigate("/revision", { replace: true });
      } else {
        setError(err.response?.data?.message || "Error al iniciar sesión");
      }
    } finally {
      setSubmitting(false);
    }
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
            className="bg-[#0C1A27] rounded-2xl m-5 md:m-5 flex items-center justify-center"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24 }}
          >
            <img src={logo} alt="SIGELED" className="max-h-[70vh] w-auto" />
          </motion.div>

          <motion.div
            className="flex flex-col justify-center p-8 md:p-20"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.24 }}
          >
            <h1 className="text-[#19F124] text-start font-semibold text-5xl md:text-6xl mb-8">
              Iniciar Sesión
            </h1>

            <form onSubmit={handleSubmit} className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <label htmlFor="email" className="sr-only">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={credentials.email}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  className="w-full h-14 px-5 rounded-xl bg-[#0E1F30] text-white placeholder-white/50 text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60 disabled:opacity-60"
                />

                <label htmlFor="password" className="sr-only">
                  Contraseña
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={handleChange}
                  required
                  disabled={submitting}
                  className="w-full h-14 px-5 rounded-xl bg-[#0E1F30] text-white placeholder-white/50 text-2xl leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60 disabled:opacity-60"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xl text-white/80">
                    ¿No tienes una cuenta?{" "}
                    <Link
                      to="/register"
                      className="text-[#19F124] font-semibold hover:underline"
                    >
                      Registrarse
                    </Link>
                  </span>
                </div>
              </motion.div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={
                  submitting
                    ? {}
                    : { scale: 1.01, boxShadow: "0 0 0 0 rgba(0,0,0,0)" }
                }
                whileTap={submitting ? {} : { scale: 0.98 }}
                className="w-full h-16 rounded-full text-4xl font-black leading-none bg-transparent mt-2 text-[#19F124] border-[3px] border-[#19F124] hover:bg-[#19F124] hover:text-[#020c14] cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-default"
              >
                {submitting ? "Ingresando..." : "Ingresar"}
              </motion.button>

              <AnimatePresence>
                {error && (
                  <motion.div
                    className="p-3 mt-4 text-[1.7rem] text-[#0a0000] font-semibold rounded-xl bg-[#f48383] flex flex-row items-center"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <BiSolidError className="w-9 h-9 mr-2 text-[#0a0000] font-black" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>
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
}
