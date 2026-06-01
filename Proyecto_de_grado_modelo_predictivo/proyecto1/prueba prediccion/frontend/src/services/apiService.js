const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Obtiene headers de autenticación
 * @returns {Object} Headers con Content-Type y Authorization Bearer
 */
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

/**
 * Verifica si el usuario está autenticado
 * @returns {Boolean}
 */
export const isAuthenticated = () => {
  return localStorage.getItem('token') !== null;
};

/**
 * Envía datos de estudiante para predicción
 * @param {Object} studentData - Datos del estudiante según StudentInput
 * @returns {Promise} Respuesta con predicción
 */
export const predictStudent = async (studentData) => {
  const response = await fetch(`${API_URL}/api/predict`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(studentData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Error en prediccion');
  }
  return response.json();
};

/**
 * Obtiene histórico de predicciones del estudiante
 * @param {String|Number} documento - Documento de identidad del estudiante
 * @returns {Promise} Lista de predicciones
 */
export const getHistory = async (documento) => {
  const response = await fetch(`${API_URL}/api/history/${documento}`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Error al obtener historial');
  }
  return response.json();
};

/**
 * Obtiene estadísticas generales de predicciones
 * @returns {Promise} Estadísticas
 */
export const getStatistics = async () => {
  const response = await fetch(`${API_URL}/api/statistics`, {
    headers: getAuthHeaders()
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Error al obtener estadísticas');
  }
  return response.json();
};

/**
 * Verifica el estado de salud de la API
 * @returns {Promise} Estado de la API
 */
export const checkHealth = async () => {
  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) {
    throw new Error('API no disponible');
  }
  return response.json();
};

/**
 * Realiza una predicción con los datos del estudiante
 * @param {Object} predictionData - Datos para predicción
 * @returns {Promise} Resultado de la predicción
 */
export const makePrediction = async (predictionData) => {
  const response = await fetch(`${API_URL}/api/predict`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(predictionData)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || errorData.error || 'Error en predicción');
  }
  return response.json();
};
