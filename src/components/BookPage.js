// file: src/components/BookPage.js

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import TextChunk from './TextChunk';

const ParagraphBreak = () => <View style={styles.paragraphBreak} />;

// ИЗМЕНЕНО: Компонент теперь принимает onChunkTranslate и chunkTranslations
const BookPage = ({ pageContent, onWordPress, theme, fontSize, lineHeight, onChunkTranslate, chunkTranslations }) => {
  // ИЗМЕНЕНО: Стиль теперь называется textStyle для ясности, так как он будет применяться к тексту внутри TextChunk.
  // Убраны flex-свойства, так как они больше не нужны на этом уровне.
  const textStyle = useMemo(() => ({
    color: theme.text,
    fontSize: fontSize,
    lineHeight: lineHeight,
  }), [theme.text, fontSize, lineHeight]);

  return (
    <ScrollView 
      style={styles.pageContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Рендерим массив блоков для этой страницы */}
      {pageContent.map((item) => { // Убрали 'index' из параметров, используем item.originalIndex для ключа
        if (item.type === 'chunk') {
          return (
            <TextChunk
              // ИЗМЕНЕНО: Ключ теперь основан на уникальном originalIndex
              key={`chunk-${item.originalIndex}`}
              
              // Старые пропсы
              content={item.content}
              onWordPress={onWordPress}
              style={textStyle} // Передаем стиль для текста
              chunkIndex={item.originalIndex}
              
              // ДОБАВЛЕНО: Пробрасываем новые пропсы для логики перевода
              theme={theme} // Тема нужна для стилизации кнопки и блока перевода
              onTranslateRequest={() => onChunkTranslate(item)} // Создаем функцию-обработчик
              translationState={chunkTranslations[item.originalIndex]} // Передаем состояние перевода для конкретного чанка
            />
          );
        }
        if (item.type === 'paragraph_break') {
          // ИЗМЕНЕНО: Ключ для разрыва также использует originalIndex
          return <ParagraphBreak key={`break-${item.originalIndex}`} />;
        }
        return null;
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    // ИЗМЕНЕНО: Уменьшаем вертикальные отступы для лучшего вида с короткими чанками (предложениями)
    paddingVertical: 20,
  },
  paragraphBreak: {
    width: '100%',
    height: 16, // Этот отступ теперь служит разрывом между абзацами
  },
});

export default React.memo(BookPage);