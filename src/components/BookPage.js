// file: src/components/BookPage.js

import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import TextChunk from './TextChunk';

const ParagraphBreak = () => <View style={styles.paragraphBreak} />;

// --- TTS: Компонент теперь принимает новые пропсы для озвучивания ---
const BookPage = ({ 
  pageContent, 
  onWordPress, 
  theme, 
  fontSize, 
  lineHeight, 
  onChunkTranslate, 
  chunkTranslations,
  onSpeak,
  speakingIdentifier,
  bookLanguage
}) => {
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
      {pageContent.map((item) => {
        if (item.type === 'chunk') {
          return (
            <TextChunk
              key={`chunk-${item.originalIndex}`}
              
              // Старые пропсы
              content={item.content}
              onWordPress={onWordPress}
              style={textStyle}
              chunkIndex={item.originalIndex}
              
              // Пропсы для перевода
              theme={theme}
              onTranslateRequest={() => onChunkTranslate(item)}
              translationState={chunkTranslations[item.originalIndex]}
              
              // --- TTS: Пробрасываем новые пропсы для озвучивания дальше в TextChunk ---
              onSpeak={onSpeak}
              speakingIdentifier={speakingIdentifier}
              bookLanguage={bookLanguage}
            />
          );
        }
        if (item.type === 'paragraph_break') {
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
    paddingVertical: 20,
  },
  paragraphBreak: {
    width: '100%',
    height: 16,
  },
});

export default React.memo(BookPage);