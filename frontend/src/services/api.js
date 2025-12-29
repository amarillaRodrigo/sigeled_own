import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  registerFull: (payload) => api.post('/auth/register-full', payload),
  logout:() =>{
    localStorage.removeItem('token');
    return Promise.resolve();
  },
  changePassword: (payload) => api.post('/auth/change-password', payload),
};

export const userService = {
  getUsuarios: () => api.get('/users'),
  getUsuarioById: (id) => api.get(`/users/${id}`),
  createUsuario: (data) => api.post('/users',data),
  updateUsuario: (id, data) => api.put(`/users/${id}`, data),
  toggleUsuario: (id) => api.put(`/users/${id}/toggle`)
};

export const roleService = {
  getRoles: () => api.get(`/roles`),
  createRole: (data) => api.post('/roles', data),
  deleteRole: (id) => api.delete(`/roles/${id}`),

  assignRoleToUser:(id_usuario, id_rol, asignado_por) =>
    api.post(`/roles/usuario/asignar`, {id_usuario, id_rol, asignado_por}),
  unassignRoleFromUser: (id_usuario, id_rol) => api.delete(`/roles/usuario/${id_usuario}/${id_rol}`),
  getRolesByUser: (userId) => api.get(`/roles/usuario/${userId}`)
}

export const personaService = {
  createPersona:(data) => api.post('/persona', data),
  getPersonaByID:(id_persona) => api.get(`/persona/${id_persona}`),
  buscadorAvanzadoUsuarios: (search, perfil) => {
    const params = {};
    if(search) params.search = search;
    if(perfil) params.perfil = perfil;
    return api.get('/persona/buscar', { params });
  },
  updatePersonaBasica:(id_persona, data) => api.patch(`/persona/${id_persona}`, data),
};

export const identificationService = {
  createIdentificacion:(id_persona, data) => api.post(`/persona/${id_persona}/identificacion`, data),
  getIdentificaciones:(id_persona) => api.get(`/persona/${id_persona}/identificacion`),
}

export const profileService = {
  getProfiles:() => api.get('/persona/perfiles'),
  assignProfile:(id_persona, id_perfil) =>
    api.post(`/persona/asignar-perfil`, {id_persona, id_perfil}),
  getPersonaProfile:(id_persona) => api.get(`/persona/${id_persona}/perfiles`),
  deleteProfile: (id_persona, id_perfil) => api.delete(`/persona/${id_persona}/perfiles/${id_perfil}`),
}

export const personaDocService = {
  listarDocumentos: (id_persona) => api.get(`/persona-doc/personas/${id_persona}/documentos`),
  getDocById: (id_persona_doc) => api.get(`/persona-doc/${id_persona_doc}`),
  createDoc: (data) => api.post('/persona-doc', data),
  cambiarEstado:(id_persona_doc, { id_estado_verificacion, observacion }) =>
    api.patch(`/persona-doc/${id_persona_doc}/estado`, {
      id_estado_verificacion,
      observacion: observacion ?? null,
    }),
  deleteDoc: (id_persona, id_persona_doc) =>
    api.delete(`/persona-doc/personas/${id_persona}/documentos/${id_persona_doc}`),
  solicitarEliminacion: (id_persona_doc, body) =>
    api.post(`/persona-doc/${id_persona_doc}/solicitar_eliminacion`, body),
};

export const estadoVerificacionService = {
  getAll: () => api.get('/persona/estados-verificacion'),
}

export const tipoDocService = {
  getAllDocTypes: () => api.get('/persona-doc/tipos-documento'),
}

export const archivoService = {
  uploadForPersona: (id_persona, file) => {
    const form = new FormData();
    form.append('archivo', file);
    return api.post(`/persona/${id_persona}/archivo`, form);
  },
  getSignedUrl: (id_archivo) => api.get(`/archivos/${id_archivo}/signed-url`),
};

export const domicilioService = {
  getDomicilioByPersona: (id_persona) => api.get(`/persona/${id_persona}/domicilio`),
  createDomicilio: (id_persona, data) => api.post(`/persona/${id_persona}/domicilio`, data),
  deleteDomicilio: (id_persona, id_domicilio) => api.delete(`/persona/personas/${id_persona}/domicilios/${id_domicilio}`),
  solicitarEliminacion: (idPersona, id_domicilio, body) =>
  api.post(`/persona/${idPersona}/domicilios/${id_domicilio}/solicitar_eliminacion`, body),
}

export const domOtrosService = {
  getDepartamentos:() => api.get(`/persona/dom/departamentos`),
  getLocalidades:(id_dom_departamento) => api.get(`/persona/dom/departamentos/${id_dom_departamento}/localidades`),
  getBarrios: (id_dom_localidad) => api.get(`/persona/dom/localidades/${id_dom_localidad}/barrios`),
  createBarrio: (id_dom_localidad, data) => api.post(`/persona/dom/localidades/${id_dom_localidad}/barrios`, data),
}

export const personaBarrioService = {
  getBarrioByPersona: (id_persona) => api.get(`/persona/${id_persona}/barrios`),
  assignBarrio: (id_persona, id_dom_barrio) => api.post(`/persona/${id_persona}/barrios`, {id_dom_barrio}),
  unassignBarrio: (id_persona, id_dom_barrio) => api.delete(`/persona/${id_persona}/barrios/${id_dom_barrio}`),
}

export const tituloService = {
  createTitulo:(data) => api.post(`/titulos/`, data),
  findTituloByPersona:(id_persona) => api.get(`/titulos/persona/${id_persona}`),
  getTiposTitulos: () => api.get(`/titulos/tipos`),
  cambiarEstado: (id_titulo, data) =>
    api.patch(`/titulos/${id_titulo}/estado`, data),
  deleteTitulo:(id_persona, id_titulo) => api.delete(`/titulos/personas/${id_persona}/titulos/${id_titulo}`),
  solicitarEliminacion: (id_titulo, body) => api.post(`/titulos/${id_titulo}/solicitar_eliminacion`, body),
};

export const contratoService = {
  getContratos: (persona) => api.get('/contratos', { params: persona ? { persona } : {} }),
  getMisContratos: () => api.get('/contratos/mis-contratos'),
  getEmpleados: (q = '', page = 1, limit = 50) => api.get('/contratos/empleados', { params: { q, page, limit } }),
  getById: (id) => api.get(`/contratos/${id}`),
  create : (data) => api.post('/contratos/profesor/crear', data),
  remove: (id) => api.delete(`/contratos/${id}`),

  buscarPersonaPorDni: (dni) => api.get(`/contratos/persona/dni/${dni}`),
  getProfesorDetalles: (idPersona) => api.get(`/contratos/profesor/${idPersona}/detalles`),
  getMateriasByCarreraAnio: (idCarrera, idAnio) => api.get(`/contratos/materias`, {params: { idCarrera, idAnio }}),
  getAnios: () => api.get('/contratos/anios'),
  getTarifasByPersona(idPersona) {
    return api.get(`/contratos/tarifas/${idPersona}`)
  },
  getPerfilTarifasConfig: () => api.get("/contratos/perfil-tarifas"),
  updatePerfilTarifa: (id_tarifa, payload) => api.put(`/contratos/perfil-tarifas/${id_tarifa}`, payload),

  exportarContrato : async (id, format = 'pdf') => {
    const res = await api.get(`/contratos/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });

    const blob = new Blob([res.data], {
      type: format === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/pdf'
    });

    const url = URL.createObjectURL(blob);

      let filename;
    const disposition =
      res.headers['content-disposition'] ||
      res.headers['Content-Disposition'];

    if (disposition) {
      let match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
      if (match && match[1]) {
        filename = decodeURIComponent(match[1]);
      } else {
        match = disposition.match(/filename="?([^"]+)"?/i);
        if (match && match[1]) {
          filename = match[1];
        }
      }
    }

    if (!filename) {
      const ext =
        format === 'word'
          ? 'docx'
          : 'pdf';

      filename = `CONTRATO-${id}.${ext}`;
    }

    return { url, filename };
  },
  getCarreras:() => api.get('/contratos/carreras'),
  getPeriodos: () => api.get('/contratos/periodos'),
  createGeneral: (payload) => api.post("/contratos/general/crear", payload),
};

export const legajoService = {
  getEstado:   (id_persona) => api.get(`/legajo/${id_persona}/estado`),
  recalcular:  (id_persona) => api.post(`/legajo/persona/${id_persona}/recalcular`),
  setEstado:   (id_persona, codigo) => api.post(`/legajo/${id_persona}/estado`, { codigo }),
  setPlazo:    (id_persona, payload) => api.post(`/legajo/${id_persona}/plazo`, payload),
};

export const dashboardService = {
  getAdminStats: () => api.get('/dashboard/admin-stats'),
  getDocumentosPendientes: (limit = 5) => api.get('/dashboard/documentos-pendientes', {params: {limit}}),
  getLegajoEstados: () => api.get('/dashboard/legajos-estados'),
  getDocumentosEstados: () => api.get('/dashboard/documentos-estados'),
}

export const notificacionService = {
  getMisNotificaciones: () => api.get('/notificaciones/mis-notificaciones'),
  listar: async () => (await api.get('/notificaciones/mis-notificaciones')).data,
  marcarLeida: async (id_notificacion) => (await api.patch(`/notificaciones/${id_notificacion}/leido`)).data,
  marcarComoLeido: async (id_notificacion) => (await api.patch(`/notificaciones/${id_notificacion}/leido`)).data,
  marcarTodasLeidas: async() => (await api.post('/notificaciones/marcar-todas-leidas')).data,
  eliminar: async (id_notificacion) => (await api.delete(`/notificaciones/${id_notificacion}`)).data,
}

export const aiChatService = {
  listSessions: () => api.get("/ai-chat/sessions"),
  createSession: (titulo) => api.post("/ai-chat/sessions", { titulo }),
  renameSession: (id_chat, titulo) => api.put(`/ai-chat/sessions/${id_chat}`, { titulo }),
  deleteSession: (id_chat) => api.delete(`/ai-chat/sessions/${id_chat}`),
  sendMessage: ({ id_chat, message }) => api.post("/ai-chat/message", { id_chat, message }),
  getMessages: (id_chat) => api.get(`/ai-chat/sessions/${id_chat}/messages`),
}

export const reporteService = {
  getInformeEscalafonario: (id_persona) => 
    api.get(`/reportes/informe-escalafonario/${id_persona}`),
  
  descargarInformeEscalafonarioPDF: async (id_persona, nombreArchivo) => {
    const response = await api.get(`/reportes/informe-escalafonario/${id_persona}/pdf`, {
      responseType: 'blob'
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo || `informe_escalafonario_${id_persona}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    
    return response;
  },

  getEstadisticasGenerales: () => 
    api.get('/reportes/estadisticas/generales'),
  
  getEstadisticasContratos: (anio) => 
    api.get('/reportes/estadisticas/contratos', { params: { anio } }),
  
  getEstadisticasTitulos: () => 
    api.get('/reportes/estadisticas/titulos'),
  
  getEstadisticasDocumentos: () => 
    api.get('/reportes/estadisticas/documentos'),

  getRankingAntiguedad: (limit = 20) => 
    api.get('/reportes/ranking/antiguedad', { params: { limit } }),
  
  getListadoDocentes: (filtros = {}) => 
    api.get('/reportes/docentes/listado', { params: filtros }),
  
  getContratosProximosVencer: (dias = 30) => 
    api.get('/reportes/contratos/proximos-vencer', { params: { dias } }),

  getDocumentosDigitalizados: (filtros = {}) => 
    api.get('/reportes/documentos/digitalizados', { params: filtros }),

  getResumenCompleto: () => 
    api.get('/reportes/resumen-completo')
}

export default api;