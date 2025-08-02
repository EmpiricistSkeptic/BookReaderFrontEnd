// file: src/components/BookPage.js

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import TextChunk from './TextChunk';

const ParagraphBreak = () => <View style={styles.paragraphBreak} />;

const BookPage = ({ pageContent, onWordPress, theme, fontSize, lineHeight }) => {
  // Создаем стили для текста на основе пропсов
  const chunkStyle = useMemo(() => ({
    color: theme.text,
    fontSize: fontSize,
    lineHeight: lineHeight,
    flexWrap: 'wrap',
    flexDirection: 'row',
  }), [theme.text, fontSize, lineHeight]);

  return (
    <ScrollView 
      style={styles.pageContainer}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Рендерим массив блоков для этой страницы */}
      {pageContent.map((item, index) => {
        if (item.type === 'chunk') {
          return (
            <TextChunk
              key={`page-chunk-${index}`}
              content={item.content}
              onWordPress={onWordPress}
              style={chunkStyle}
              // Передаем уникальный индекс чанка внутри главы для корректного выделения
              chunkIndex={item.originalIndex} 
            />
          );
        }
        if (item.type === 'paragraph_break') {
          return <ParagraphBreak key={`page-break-${index}`} />;
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
    paddingVertical: 40,
  },
  paragraphBreak: {
    width: '100%',
    height: 16,
  },
});

export default React.memo(BookPage);