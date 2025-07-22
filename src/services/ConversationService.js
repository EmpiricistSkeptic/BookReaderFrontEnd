import { apiRequest } from './ApiService';

const CONVERSATIONS_ENDPOINT = '/conversations/';

/**
 * Получить список всех диалогов пользователя.
 * @returns {Promise<Array>} - Массив диалогов.
 */
export const getConversations = async () => {
  return await apiRequest(CONVERSATIONS_ENDPOINT, 'GET');
};

/**
 * Получить детали конкретного диалога со всеми сообщениями.
 * @param {number} conversationId - ID диалога.
 * @returns {Promise<object>} - Объект диалога с сообщениями.
 */
export const getConversationDetails = async (conversationId) => {
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
  // DELETE запросы обычно не возвращают тело, поэтому просто ждем ответа
  await apiRequest(`${CONVERSATIONS_ENDPOINT}${conversationId}/`, 'DELETE');
};