/**
 * Разбивает строку текста на массив объектов-слов и пробелов.
 * Каждому слову присваивается уникальный wordIndex внутри параграфа.
 * @param {string} text - Исходная строка текста.
 * @returns {Array<Object>}
 */
export const parseContentToWords = (text) => {
  if (!text) return [];

  const parts = text.split(/(\s+)/);
  let wordCounter = 0;

  return parts
    .filter(part => part.length > 0)
    .map(part => {
      const isWord = part.trim().length > 0;
      if (isWord) {
        const wordData = {
          type: 'word',
          text: part,
          wordIndex: wordCounter,
        };
        wordCounter++;
        return wordData;
      } else {
        return {
          type: 'space',
          text: part,
        };
      }
    });
};

