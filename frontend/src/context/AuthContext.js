import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      cargarPerfil();
    } else {
      setCargando(false);
    }
  }, [token]);

  const cargarPerfil = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUsuario(response.data);
    } catch (error) {
      console.error('Error cargando perfil:', error);
      cerrarSesion();
    } finally {
      setCargando(false);
    }
  };

  const iniciarSesion = async (email, contraseña) => {
    const response = await axios.post(`${API}/auth/login`, { email, contraseña });
    const { access_token, usuario } = response.data;
    setToken(access_token);
    setUsuario(usuario);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return usuario;
  };

  const cerrarSesion = () => {
    setToken(null);
    setUsuario(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  const valor = {
    usuario,
    token,
    cargando,
    iniciarSesion,
    cerrarSesion,
    autenticado: !!token
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
};
