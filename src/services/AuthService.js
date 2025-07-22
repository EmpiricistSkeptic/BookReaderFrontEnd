import { apiRequest } from './ApiService';

const AUTH_ENDPOINT = '/auth/';

// Google авторизация
export async function googleAuth(idToken) {
  const payload = { id_token: idToken };
  const data = await apiRequest(`${AUTH_ENDPOINT}google/`, 'POST', payload);
  return {
    user:   data.user,
    access: data.tokens.access,
    refresh:data.tokens.refresh,
    message:data.message,
  };
}

// Регистрация пользователя
export async function registerUser(userData) {
  const data = await apiRequest(`${AUTH_ENDPOINT}register/`, 'POST', userData);
  return {
    user:    data.user,
    access:  data.tokens.access,
    refresh: data.tokens.refresh,
    message: data.message,
  };
}

// Вход пользователя
export async function loginUser(credentials) {
  const data = await apiRequest(`${AUTH_ENDPOINT}login/`, 'POST', credentials);
  return {
    user:    data.user,
    access:  data.tokens.access,
    refresh: data.tokens.refresh,
    message: data.message,
  };
}

// Обновление токена
export async function refreshTokenService(refresh) {
  const data = await apiRequest(`${AUTH_ENDPOINT}refresh/`, 'POST', { refresh });
  return data.access;
}

