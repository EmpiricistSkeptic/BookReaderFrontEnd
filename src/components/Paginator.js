// file: src/components/Paginator.js

import React, { useCallback, useMemo } from 'react';
import { View, Text } from 'react-native';

/**
 * Умный невидимый компонент, который измеряет текст и возвращает
 * массив страниц, где каждая страница - это массив контент-блоков.
 */
const Paginator = ({ structuredContent, pageStyle, onPaginated }) => {

  // Создаем "сплющенный" текст для измерения и карту индексов
  const { flatText, measurementMap } = useMemo(() => {
    let text = '';
    const map = [];
    structuredContent.forEach((item, index) => {
      const start = text.length;
      // Добавляем маркеры, чтобы точно знать, где начинается и заканчивается каждый блок
      if (item.type === 'chunk') {
        text += item.content + ' ';
      } else if (item.type === 'paragraph_break') {
        text += '\n';
      }
      const end = text.length;
      map.push({ type: item.type, originalIndex: index, start, end });
    });
    return { flatText: text, measurementMap: map };
  }, [structuredContent]);

  const handleTextLayout = useCallback((event) => {
    const { lines } = event.nativeEvent;
    if (!lines || lines.length === 0) {
      onPaginated([]);
      return;
    }

    const pageHeight = pageStyle.height;
    const pages = [];
    let currentPage = [];
    let currentPageChunks = new Set(); // Чтобы избежать дублирования чанков на странице
    let startY = lines[0].y;

    lines.forEach(line => {
      // Определяем, какие оригинальные блоки попали в эту строку
      const lineStart = line.text.length > 0 ? flatText.indexOf(line.text) : -1;
      const lineEnd = lineStart !== -1 ? lineStart + line.text.length : -1;

      if (lineStart !== -1) {
        measurementMap.forEach(chunk => {
          // Если чанк пересекается с отрендеренной строкой
          if (chunk.start < lineEnd && chunk.end > lineStart) {
            // Если чанк еще не был добавлен на эту страницу
            if (!currentPageChunks.has(chunk.originalIndex)) {
              // Проверяем, поместится ли новая строка на страницу
              if ((line.y - startY) + line.height <= pageHeight) {
                currentPage.push(structuredContent[chunk.originalIndex]);
                currentPageChunks.add(chunk.originalIndex);
              } else {
                // Страница заполнена
                pages.push(currentPage);
                
                // Начинаем новую страницу
                startY = line.y;
                currentPage = [structuredContent[chunk.originalIndex]];
                currentPageChunks = new Set([chunk.originalIndex]);
              }
            }
          }
        });
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    onPaginated(pages);
  }, [pageStyle.height, onPaginated, flatText, measurementMap, structuredContent]);

  return (
    <View style={styles.offscreenContainer} pointerEvents="none">
      <Text
        style={{ width: pageStyle.width, fontSize: pageStyle.fontSize, lineHeight: pageStyle.lineHeight }}
        onTextLayout={handleTextLayout}
      >
        {flatText}
      </Text>
    </View>
  );
};

const styles = {
  offscreenContainer: {
    position: 'absolute',
    top: 10000,
    left: 10000,
    opacity: 0,
  },
};

export default React.memo(Paginator);