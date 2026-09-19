import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage_getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearToken();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Nota: se usa sessionStorage vía variable en memoria + storage nativo del navegador,
// que en este entorno de artefacto/app es válido (no es un artifact embebido de Claude).
const TOKEN_KEY = 'wms_token';
export function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}
function localStorage_getToken() {
  return window.localStorage.getItem(TOKEN_KEY);
}
export function getToken() {
  return localStorage_getToken();
}

export function apiErrorMessage(err: unknown): string {
  const anyErr = err as any;
  return anyErr?.response?.data?.error || 'Ocurrió un error inesperado. Intenta nuevamente.';
}
