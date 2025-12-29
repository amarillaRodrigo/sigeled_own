import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useAuth } from "../../context/AuthContext";
import { contratoService } from "../../services/api";
import LoadingState from "../../components/LoadingState";
import {
  FiBook,
  FiBriefcase,
  FiDollarSign,
  FiLayers,
  FiClock,
  FiCalendar,
  FiTarget,
} from "react-icons/fi";

const Panel = ({ className = "", ...props }) => (
  <div
    className={`bg-[#101922] border border-[#1b2a37] rounded-2xl ${className}`}
    {...props}
  />
);

const MotionPanel = motion.create(Panel);

const safeNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const formatDate = (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-AR");
};

const getPeriodo = (m) =>
  m.periodo_descripcion ||
  m.nombre_periodo ||
  m.periodo ||
  (m.id_periodo != null ? `Período ${m.id_periodo}` : null);

const esPerfilProfesor = (p) => {
  const nombre = String(p.perfil_nombre || p.nombre || "").toLowerCase();
  const codigo = String(p.perfil_codigo || p.codigo || "").toLowerCase();
  return nombre.includes("profesor") || codigo === "prof" || p.id_perfil === 1;
};

const esPerfilCoordinador = (p) => {
  const nombre = String(p.perfil_nombre || p.nombre || "").toLowerCase();
  const codigo = String(p.perfil_codigo || p.codigo || "").toLowerCase();
  return (
    nombre.includes("coordinador") || codigo === "coor" || p.id_perfil === 2
  );
};

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

const cargoNormalizado = (codigo) => {
  const code = String(codigo || "").toUpperCase();
  switch (code) {
    case "TITULAR":
      return "Profesor Titular";
    case "JTP":
      return "Jefe de Trabajos Prácticos";
    case "AUXILIAR":
      return "Auxiliar de cátedra";
    default:
      return codigo || "Sin cargo";
  }
};

export default function MisMateriasYCargos() {
  const { user } = useAuth();

  const idPersona =
    user?.id_persona ||
    user?.persona?.id_persona ||
    user?.persona_id ||
    user?.personaId ||
    null;

  const {
    data: detalles,
    isLoading: loadingMaterias,
    isError: errorMaterias,
    error: materiasError,
  } = useQuery({
    queryKey: ["profesor-detalles", idPersona],
    enabled: !!idPersona,
    queryFn: async () => {
      const { data } = await contratoService.getProfesorDetalles(idPersona);
      return data;
    },
  });

  const {
    data: perfilesTarifas = [],
    isLoading: loadingCargos,
    isError: errorCargos,
    error: cargosError,
  } = useQuery({
    queryKey: ["tarifas-persona", idPersona],
    enabled: !!idPersona,
    queryFn: async () => {
      const { data } = await contratoService.getTarifasByPersona(idPersona);
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.perfiles)) return data.perfiles;
      return [];
    },
  });

  const {
    data: misContratos = [],
    isLoading: loadingContratos,
    isError: errorContratos,
    error: contratosError,
  } = useQuery({
    queryKey: ["mis-contratos"],
    enabled: !!idPersona,
    queryFn: async () => {
      const { data } = await contratoService.getMisContratos();
      return Array.isArray(data) ? data : [];
    },
  });

  const materias = Array.isArray(detalles?.materias) ? detalles.materias : [];
  const totalMaterias = materias.length;

  const carrerasSet = new Set(materias.map((m) => m.carrera).filter(Boolean));
  const aniosSet = new Set(materias.map((m) => m.anio).filter(Boolean));

  const perfilesNormalizados = perfilesTarifas.map((p) => ({
    ...p,
    tarifas: normalizeTarifas(p.tarifas),
  }));

  const perfilesConCargos = perfilesNormalizados.filter((p) => {
    if (esPerfilProfesor(p)) return false;
    const tarifas = Array.isArray(p.tarifas) ? p.tarifas : [];
    return tarifas.length > 0;
  });

  const totalCargos = perfilesConCargos.reduce((acc, p) => {
    const tarifas = Array.isArray(p.tarifas) ? p.tarifas : [];
    return acc + tarifas.length;
  }, 0);

  const montos = perfilesConCargos
    .flatMap((p) => p.tarifas || [])
    .map((t) => Number(t.monto_hora))
    .filter((n) => !Number.isNaN(n));

  const montoPromedio = montos.length
    ? montos.reduce((a, b) => a + b, 0) / montos.length
    : null;

  const carrerasCoordinadasSet = new Set();

  if (Array.isArray(misContratos)) {
    misContratos.forEach((c) => {
      const items = Array.isArray(c.items) ? c.items : [];
      items.forEach((it) => {
        const tipo = String(it.tipo_item || "").toUpperCase();
        const codCargo = String(it.codigo_cargo || "").toUpperCase();

        if (tipo === "COORDINACION" && codCargo === "COORDINADOR_CARRERA") {
          let carrera = it.descripcion_actividad || "";

          const match =
            carrera.match(/de la\s+(.+)/i) ||
            carrera.match(/de el\s+(.+)/i) ||
            carrera.match(/de\s+(.+)/i);

          if (match && match[1]) {
            carrera = match[1].trim();
          }

          if (carrera) {
            carrerasCoordinadasSet.add(carrera);
          }
        }
      });
    });
  }

  const carrerasCoordinadas = Array.from(carrerasCoordinadasSet);

  const loadingAll = loadingMaterias || loadingCargos || loadingContratos;

  return (
    <motion.div
      className="p-6 flex flex-col gap-5 h-[calc(100vh-2rem)] lg:h-[calc(100vh)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="space-y-1 shrink-0">
        <h1 className="ml-5 text-4xl font-medium text-white">
          Mis <span className="font-black">Materias</span> y <span className="font-black">Cargos</span>
        </h1>

        {!loadingAll &&
          !errorMaterias &&
          !errorCargos &&
          !errorContratos && (
            <div className="flex flex-wrap gap-2 mt-2 ml-5 text-xs">
              <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Materias:{" "}
                <span className="font-semibold text-white">
                  {totalMaterias}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Carreras distintas:{" "}
                <span className="font-semibold text-white">
                  {carrerasSet.size}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Años académicos:{" "}
                <span className="font-semibold text-white">
                  {aniosSet.size}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Perfiles con cargos (sin profesor):{" "}
                <span className="font-semibold text-white">
                  {perfilesConCargos.length}
                </span>
              </span>
              <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1]">
                Cargos totales:{" "}
                <span className="font-semibold text-white">
                  {totalCargos}
                </span>
              </span>
              {carrerasCoordinadas.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-[#101922] border border-[#1b2a37] text-[#9fb2c1] flex items-center gap-1">
                  <FiBook size={12} />
                  <span>
                    Carrera(s) coordinadas:{" "}
                    <span className="font-semibold text-white">
                      {carrerasCoordinadas.join(" · ")}
                    </span>
                  </span>
                </span>
              )}
            </div>
          )}
      </div>

      {loadingAll && (
        <Panel className="flex items-center justify-center flex-1">
          <LoadingState
            classNameContainer="min-h-0"
            classNameImg="w-28 h-28"
          />
        </Panel>
      )}

      {!loadingAll && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 flex-1 min-h-[300px]">
          <Panel className="flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1b2a37] flex items-center justify-between gap-2">
              <div>
                <h2 className="flex items-center gap-2 text-3xl font-semibold text-[#19F124]">
                  <FiBook className="text-[#19F124]" />
                  Mis Materias
                </h2>
                {detalles && (
                  <p className="mt-1 text-xs text-[#9fb2c1]">
                    {detalles.cargo_descripcion && (
                      <>
                        {" · "}
                        <span className="text-[#19F124]">
                          {detalles.cargo_descripcion}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
            </div>

            {errorMaterias && (
              <div className="flex items-center justify-center flex-1 px-4 text-sm text-center text-red-400">
                No se pudieron cargar tus materias.
                <br />
                {materiasError?.response?.data?.error ||
                  materiasError?.message}
              </div>
            )}

            {!errorMaterias && !materias.length ? (
              <div className="flex items-center justify-center flex-1 px-4 text-sm text-center opacity-70">
                No tenés materias asignadas.
              </div>
            ) : (
              !errorMaterias && (
                <div className="flex-1 overflow-auto [scrollbar-gutter:stable] p-4">
                  <div className="grid gap-3 md:grid-cols-1">
                    {materias.map((m, idx) => {
                      const key =
                        m.id_contrato && m.id_materia
                          ? `${m.id_contrato}-${m.id_materia}`
                          : m.id_materia ||
                            `${m.descripcion_materia ?? "materia"}-${idx}`;

                      const horasSem = safeNumber(m.horas_semanales);
                      const horasMensuales = safeNumber(
                        m.horas_mensuales ??
                          (horasSem != null ? horasSem * 4 : null)
                      );
                      const montoHora = safeNumber(m.monto_hora);
                      const subtotalMensual = safeNumber(
                        m.subtotal_mensual ??
                          (horasMensuales != null && montoHora != null
                            ? horasMensuales * montoHora
                            : null)
                      );

                      const fechaInicio = formatDate(m.fecha_inicio);
                      const fechaFin = formatDate(m.fecha_fin);

                      return (
                        <motion.div
                          key={key}
                          className="flex flex-col gap-3 p-4 mb-1 font-semibold bg-[#10242a] border border-[#19f12423] rounded-xl"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ y: -2, scale: 1.01 }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 bg-[#212e3a] border border-[#283746] rounded-xl">
                                <FiBook
                                  size={16}
                                  className="text-[#19F124]"
                                />
                              </div>
                              <div>
                                <h3 className="text-xl font-semibold text-white">
                                  {m.descripcion_materia ||
                                    "Materia sin nombre"}
                                </h3>
                                {m.carrera && (
                                  <p className="text-bg text-[#9fb2c1]">
                                    {m.carrera}
                                  </p>
                                )}
                              </div>
                            </div>

                            {m.anio && (
                              <span className="px-4 w-40 py-0.5 rounded-full text-center justify-center text-bg bg-[#142033] text-[#9fb2c1] flex items-center gap-1">
                                <FiLayers size={14} />
                                {m.anio}
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 text-bg text-[#9fb2c1]">
                            {m.codigo_cargo && (
                              <div className="flex items-center gap-2">
                                <FiLayers size={16} />
                                <span>
                                  Cargo en esta materia:{" "}
                                  <span className="text-white">
                                    {cargoNormalizado(m.codigo_cargo)}
                                  </span>
                                </span>
                              </div>
                            )}

                            {horasSem != null && (
                              <div className="flex items-center gap-1.5">
                                <FiClock size={16} />
                                <span>
                                  Horas semanales:{" "}
                                  <span className="text-white">
                                    {horasSem}
                                  </span>
                                </span>
                              </div>
                            )}

                            {horasMensuales != null && (
                              <div className="flex items-center gap-1.5">
                                <FiClock size={16} />
                                <span>
                                  Horas mensuales:{" "}
                                  <span className="text-white">
                                    {horasMensuales}
                                  </span>
                                </span>
                              </div>
                            )}

                            {montoHora != null && (
                              <div className="flex items-center gap-1.5">
                                <FiDollarSign size={16} />
                                <span>
                                  Monto por hora:{" "}
                                  <span className="text-[#19F124]">
                                    $ {montoHora.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            )}

                            {subtotalMensual != null && (
                              <div className="flex items-center gap-1.5">
                                <FiDollarSign size={16} />
                                <span>
                                  Subtotal mensual:{" "}
                                  <span className="text-[#19F124] font-semibold">
                                    $ {subtotalMensual.toFixed(2)}
                                  </span>
                                </span>
                              </div>
                            )}

                            {getPeriodo(m) && (
                              <div className="flex items-center gap-2">
                                <FiTarget size={16} />
                                <span>
                                  Período:{" "}
                                  <span className="text-white">
                                    {getPeriodo(m)}
                                  </span>
                                </span>
                              </div>
                            )}

                            {(fechaInicio || fechaFin) && (
                              <div className="flex items-center gap-1.5">
                                <FiCalendar size={16} />
                                <span>
                                  Vigencia:{" "}
                                  <span className="text-white">
                                    {fechaInicio || "¿sin inicio?"} {" → "}
                                    {fechaFin || "¿sin fin?"}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </Panel>

          <Panel className="flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#1b2a37]">
              <h2 className="flex items-center gap-2 text-3xl font-semibold text-[#19F124]">
                <FiBriefcase className="text-[#19F124]" />
                Mis Cargos
              </h2>
            </div>

            {errorCargos && (
              <div className="flex items-center justify-center flex-1 px-4 text-sm text-center text-red-400">
                No se pudieron cargar tus cargos.
                <br />
                {cargosError?.response?.data?.error || cargosError?.message}
              </div>
            )}

            {errorContratos && (
              <div className="flex items-center justify-center flex-1 px-4 text-xs text-center text-yellow-400">
                No se pudieron cargar tus contratos para determinar carreras coordinadas.
                <br />
                {contratosError?.response?.data?.error ||
                  contratosError?.message}
              </div>
            )}

            {!errorCargos && !totalCargos ? (
              <div className="flex items-center justify-center flex-1 px-4 text-sm text-center opacity-70">
                No tenés cargos asignados (distintos de profesor).
              </div>
            ) : (
              !errorCargos && (
                <div className="flex-1 overflow-auto [scrollbar-gutter:stable] p-3 space-y-3">
                  {perfilesConCargos.map((perfil, idxPerfil) => {
                    const tarifas = Array.isArray(perfil.tarifas)
                      ? perfil.tarifas
                      : [];
                    if (!tarifas.length) return null;

                    const nombrePerfil =
                      perfil.perfil_nombre ||
                      perfil.perfil_codigo ||
                      "Perfil sin nombre";

                    const esCoordinador = esPerfilCoordinador(perfil);

                    return (
                      <MotionPanel
                        key={perfil.id_perfil ?? idxPerfil}
                        className="flex flex-col gap-3 p-4 mb-5 font-semibold bg-[#10242a] border border-[#19f12423] rounded-xl"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          whileHover={{ y: -2, scale: 1.01 }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-[#212e3a] border border-[#283746] rounded-xl">
                              <FiLayers
                                size={24}
                                className="text-[#4FC3F7]"
                              />
                            </div>
                            <h3 className="text-xl font-semibold text-white">
                              {nombrePerfil}
                            </h3>
                          </div>
                        </div>

                        {esCoordinador && carrerasCoordinadas.length > 0 && (
                          <div className="mt-1 mb-2 text-[0.7rem] text-[#d0e1f2] flex items-center gap-1.5">
                            <FiBook size={11} />
                            <span>
                              Carrera(s) que coordinás:{" "}
                              <span className="text-white">
                                {carrerasCoordinadas.join(" · ")}
                              </span>
                            </span>
                          </div>
                        )}

                        <div className="mt-2 text-[0.72rem] text-[#e3edf7] space-y-1.5">
                          {tarifas.map((t, idxT) => {
                            const key = t.id_tarifa ?? idxT;
                            const montoHoraTarifa = safeNumber(t.monto_hora);

                            return (
                              <div
                                key={key}
                                className="pt-2 border-t border-[#2a3a4a] first:pt-0 first:border-t-0"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <FiBriefcase
                                      size={16}
                                      className="text-[#FFE082]"
                                    />
                                    <span className="text-xl font-semibold text-white">
                                      {t.descripcion ||
                                        "Cargo sin descripción"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3 mt-3 text-sm">
                                  <span className="flex items-center gap-1.5">
                                    <FiTarget size={16} />
                                    <span>
                                      Aplica a:{" "}
                                      <span className="text-white">
                                        {t.aplica_materias
                                          ? "Materias / Docencia"
                                          : "Otras actividades"}
                                      </span>
                                    </span>
                                  </span>

                                  {montoHoraTarifa != null && (
                                    <span className="flex items-center gap-1.5">
                                      <FiDollarSign size={16} />
                                      <span>
                                        Monto / hora:{" "}
                                        <span className="text-[#19F124] font-semibold">
                                          $ {montoHoraTarifa.toFixed(2)}
                                        </span>
                                      </span>
                                    </span>
                                  )}
                                </div>

                                {t.observaciones && (
                                  <p className="mt-1 text-[0.65rem] text-[#d0e1f2]/90">
                                    {t.observaciones}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </MotionPanel>
                    );
                  })}
                </div>
              )
            )}
          </Panel>
        </div>
      )}
    </motion.div>
  );
}
