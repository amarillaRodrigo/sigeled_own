import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { notificacionService } from '../services/api';

const AuthContext = createContext();

const getSocketURL = (apiUrl) => {
  try {
    const url = new URL(apiUrl);
    return url.origin;
  } catch (error) {
    console.error("VITE_API_URL inválida:", apiUrl);
    return import.meta.env.VITE_API_URL;

  }
};

const socketURL =
  import.meta.env.VITE_SOCKET_URL ||
  getSocketURL(import.meta.env.VITE_API_URL);

const socket = io(socketURL, {
  autoConnect: false,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  const isActive = (u) => u?.activo === true;

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setNotifications([]);
  }, []);

  useEffect(() => {
    const onNewNotification = (notificacion) => {
      setNotifications((prev) => [notificacion, ...prev]);
    };

    socket.on('connect_error', (err) => {
      console.error('[Socket.IO] connect_error:', err?.message || err);
    });
    socket.on('nueva_notificacion', onNewNotification);

    const loadUser = () => {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');

      if (token && userData) {
        let parsed = JSON.parse(userData);

        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            if (!parsed.id_persona && payload?.id_persona) {
              parsed = { ...parsed, id_persona: payload.id_persona };
            }
            if (typeof parsed.activo === 'undefined' && typeof payload?.activo !== 'undefined') {
              parsed = { ...parsed, activo: !!payload.activo };
            }
          } catch {}
        }

        setUser(parsed);
      }
      setLoading(false);
    };

    loadUser();

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('nueva_notificacion', onNewNotification);
    };
  }, [logout]);

  useEffect(() => {
    if (user?.id_usuario && isActive(user)) {
      socket.auth = { token: localStorage.getItem('token') };
      if (!socket.connected) socket.connect();

      (async () => {
        try {
          const { data } = await notificacionService.getMisNotificaciones();
          setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error al cargar notificaciones:', error);
          if (error.response?.status === 401) logout();
        }
      })();
    } else if (!loading) {
      if (socket.connected) socket.disconnect();
      setNotifications([]);
    }
  }, [user, loading, logout]);

  const login = useCallback(async (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);

    try {
      if (userData?.activo === true && userData?.id_usuario) {
        const { data } = await notificacionService.getMisNotificaciones();
        setNotifications(Array.isArray(data) ? data : []);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error al cargar notificaciones en login:', error);
    }
  }, []);

  const updateUser = useCallback((partialOrUpdater) => {
    setUser((prev) => {
      const next =
        typeof partialOrUpdater === 'function'
          ? partialOrUpdater(prev)
          : { ...prev, ...partialOrUpdater };
      localStorage.setItem('user', JSON.stringify(next));
      return next;
    });
  }, []);

  const updateUserPerfiles = useCallback(
    (perfiles) => {
      updateUser((prev) => ({ ...prev, perfiles }));
    },
    [updateUser]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, updateUser, updateUserPerfiles, notifications, setNotifications }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
