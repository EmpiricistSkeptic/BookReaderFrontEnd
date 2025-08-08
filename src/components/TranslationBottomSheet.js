// file: src/components/TranslationBottomSheet.js

import React from 'react';
// --- TTS: Импортируем TouchableOpacity для кнопки и Ionicons для иконки ---
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

// --- TTS: Принимаем новые пропсы onSpeak и bookLanguage ---
const TranslationBottomSheet = ({ bottomSheetRef, isTranslating, translationResult, theme, onChange, onSpeak, bookLanguage }) => {
  const snapPoints = React.useMemo(() => ['25%', '50%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={onChange}
      enablePanDownToClose={true}
      backgroundStyle={{ backgroundColor: theme.ui_bg }}
      handleIndicatorStyle={{ backgroundColor: theme.tint }}
    >
      <BottomSheetView style={styles.contentContainer}>
        {isTranslating ? (
          <ActivityIndicator size="large" color={theme.tint} />
        ) : translationResult ? (
          translationResult.error ? (
            <Text style={[styles.errorText, { color: 'red' }]}>{translationResult.error}</Text>
          ) : (
            <View style={styles.resultsContainer}>
              {/* --- TTS: Контейнер для слова и иконки озвучивания --- */}
              <View style={styles.originalTextContainer}>
                <Text style={[styles.originalText, { color: theme.tint }]}>
                  {translationResult.original_text}
                </Text>
                {/* --- TTS: Кнопка для озвучивания слова --- */}
                <TouchableOpacity 
                  style={styles.speakButton}
                  onPress={() => onSpeak(
                    translationResult.original_text,
                    `word-${translationResult.original_text}`, // Уникальный идентификатор
                    bookLanguage
                  )}
                >
                  <Ionicons name="volume-medium-outline" size={28} color={theme.tint} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.translatedText, { color: theme.text }]}>
                {translationResult.translated_text}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.disabled }]} />
              <Text style={[styles.metaText, { color: theme.disabled }]}>
                {/* Предполагаю, что эти поля есть в ответе. Если нет - адаптируйте */}
                {`Переведено с ${translationResult.source_language || '...'} • ${translationResult.service}`}
              </Text>
            </View>
          )
        ) : null}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  resultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // --- TTS: Новый стиль для контейнера слова и иконки ---
  originalTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  originalText: {
    fontSize: 24,
    fontWeight: 'bold',
    // --- TTS: Добавляем отступ, чтобы текст не прилипал к иконке ---
    marginRight: 15,
    textAlign: 'center',
  },
  // --- TTS: Стиль для самой кнопки (можно добавить padding для увеличения области нажатия) ---
  speakButton: {
    padding: 5,
  },
  translatedText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    width: '80%',
    alignSelf: 'center',
    marginVertical: 15,
  },
  metaText: {
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  }
});

export default TranslationBottomSheet;