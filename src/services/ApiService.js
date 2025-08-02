import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = 'http://192.168.0.102:8000/api';

/**
 * Универсальная функция для выполнения запросов к API.
 * Автоматически добавляет токен авторизации и корректно обрабатывает
 * как JSON-данные, так и FormData для загрузки файлов.
 *
 * @param {string} endpoint - Конечная точка API (например, '/users/').
 * @param {string} [method='GET'] - HTTP-метод.
 * @param {object | FormData | null} [body=null] - Тело запроса. Может быть объектом для JSON или FormData.
 * @param {object} [extraHeaders={}] - Дополнительные заголовки.
 * @returns {Promise<any>} - Данные ответа сервера.
 */
export async function apiRequest(endpoint, method = 'GET', body = null, extraHeaders = {}) {
  const token = await AsyncStorage.getItem('accessToken');

  // 1. Устанавливаем заголовки по умолчанию, включая JSON Content-Type
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };

  const config = {
    method,
    headers,
  };

  // 2. Обрабатываем тело запроса
  if (body) {
    if (body instanceof FormData) {
      // 2a. Если это FormData, fetch сам установит правильный Content-Type с boundary.
      // Поэтому мы ОБЯЗАТЕЛЬНО удаляем наш заголовок 'Content-Type': 'application/json'.
      delete headers['Content-Type'];
      config.body = body;
    } else {
      // 2b. Для обычных объектов, как и раньше, преобразуем в JSON.
      config.body = JSON.stringify(body);
    }
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (networkError) {
    console.error('Сетевая ошибка:', networkError);
    throw new Error('Сетевой сбой. Проверьте подключение к интернету.');
  }

  // Попытка получить текстовый ответ для отладки в случае ошибки
  const responseText = await response.text();

  if (!response.ok) {
    let errorData;
    try {
      // Пытаемся парсить ошибку как JSON
      errorData = JSON.parse(responseText);
    } catch {
      // Если не получилось, возвращаем текстовый ответ
      console.error('API ошибка (не JSON):', response.status, responseText);
      throw new Error(responseText || `Ошибка сервера: ${response.status}`);
    }
    
    // Пытаемся взять человекочитаемое сообщение
    const msg = errorData.error || errorData.detail || JSON.stringify(errorData);
    console.error('API ошибка:', response.status, errorData);
    throw new Error(msg);
  }

  try {
    // Если ответ успешный, пытаемся парсить его как JSON
    return JSON.parse(responseText);
  } catch {
    // Если тело ответа пустое (например, при 204 No Content), возвращаем null
    return null;
  }
}

