const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Inicia sesión con email y password
 * @param {String} email - Email del usuario
 * @param {String} password - Contraseña
 * @returns {Promise} Datos del usuario y token
 */
export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Credenciales inválidas');
  }

  const data = await response.json();
  localStorage.setItem('token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
};

/**
 * Registra un nuevo usuario
 * @param {String} nombre - Nombre completo
 * @param {String} email - Email del usuario
 * @param {String} password - Contraseña
 * @returns {Promise} Datos del usuario
 */
export const register = async (nombre, email, password) => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, email, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Error al registrar usuario');
  }

  return response.json();
};

/**
 * Cierra la sesión del usuario
 */
export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Obtiene el usuario actual del localStorage
 * @returns {Object|null} Usuario actual o null
 */
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

/**
 * Verifica si el usuario está autenticado
 * @returns {Boolean}
 */
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

/**
 * Obtiene el token del usuario
 * @returns {String|null}
 */
export const getToken = () => {
  return localStorage.getItem('token');
};