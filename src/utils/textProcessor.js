// file: src/utils/textProcessor.js

export const processTextToStructuredChunks = (paragraphs) => {
  if (!paragraphs || paragraphs.length === 0) {
    return [];
  }

  const structuredData = [];
  const sentenceBoundaryRegex = /(?<=[.?!])\s+/;
  let elementCounter = 0; // ДОБАВЛЕНО: Счетчик для уникальных индексов

  paragraphs.forEach(paragraph => {
    // Пропускаем пустые параграфы, которые могли прийти от API
    if (paragraph.trim().length === 0) {
      return;
    }
    
    const sentences = paragraph.trim().split(sentenceBoundaryRegex);

    sentences.forEach(sentence => {
      if (sentence && sentence.trim().length > 0) {
        // ИЗМЕНЕНО: Добавляем объект с типом 'chunk' и уникальным индексом
        structuredData.push({
          type: 'chunk',
          content: sentence.trim(),
          originalIndex: elementCounter++, // Присваиваем и увеличиваем счетчик
        });
      }
    });

    // ИЗМЕНЕНО: Добавляем маркер разрыва с индексом (полезно для React-ключей)
    structuredData.push({ type: 'paragraph_break', originalIndex: elementCounter++ });
  });

  // Удаляем последний разрыв, если он есть, чтобы не было лишнего отступа в конце
  if (structuredData.length > 0 && structuredData[structuredData.length - 1].type === 'paragraph_break') {
    structuredData.pop();
  }

  return structuredData;
};