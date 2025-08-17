import { apiRequest } from './ApiService';

const CONVERSATIONS_ENDPOINT = '/conversations/';

/**
 * Получить список всех диалогов пользователя (с пагинацией).
 * @param {number} page - Номер страницы.
 * @returns {Promise<object>} - Пагинированный список диалогов.
 */
export const getConversations = async (page = 1) => {
  // Эта функция остается с пагинацией, она работает правильно.
  return await apiRequest(`${CONVERSATIONS_ENDPOINT}?page=${page}`, 'GET');
};

/**
 * Получить детали конкретного диалога со всеми сообщениями (БЕЗ пагинации).
 * @param {number} conversationId - ID диалога.
 * @returns {Promise<object>} - Объект диалога с полным списком сообщений.
 */
export const getConversationDetails = async (conversationId) => {
  // --- ИЗМЕНЕНИЕ ЗДЕСЬ ---
  // Убираем параметр 'page' из функции и из URL.
  return await apiRequest(`${CONVERSATIONS_ENDPOINT}${conversationId}/`, 'GET');
};

/**
 * Создать новый диалог.
 * @returns {Promise<object>} - Созданный объект диалога.
 */
export const createConversation = async () => {
  return await apiRequest(CONVERSATIONS_ENDPOINT, 'POST', {});
};

/**
 * Отправить сообщение в диалог.
 * @param {number} conversationId - ID диалога.
 * @param {string} message - Текст сообщения.
 * @returns {Promise<object>} - Ответ с сообщением пользователя и ответом AI.
 */
export const sendMessage = async (conversationId, message) => {
  const payload = { message };
  return await apiRequest(
    `${CONVERSATIONS_ENDPOINT}${conversationId}/send_message/`,
    'POST',
    payload
  );
};

/**
 * Удалить диалог.
 * @param {number} conversationId - ID диалога для удаления.
 * @returns {Promise<void>}
 */
export const deleteConversation = async (conversationId) => {
  await apiRequest(`${CONVERSATIONS_ENDPOINT}${conversationId}/`, 'DELETE');
};