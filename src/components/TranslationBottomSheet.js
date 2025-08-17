import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';

// Добавляем новый prop: onAddToFlashcards
const TranslationBottomSheet = ({ bottomSheetRef, isTranslating, translationResult, theme, onChange, onSpeak, bookLanguage, onAddToFlashcards }) => {
  const snapPoints = React.useMemo(() => ['35%', '55%'], []);

  const hasAlternatives =
    translationResult &&
    !translationResult.error &&
    Array.isArray(translationResult.alternatives) &&
    translationResult.alternatives.length > 0;

  const cardStyle = {
    backgroundColor: theme.bg[0],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.type === 'dark' ? 0.4 : 0.1,
    shadowRadius: 8,
    elevation: 5,
  };

  const alternativesContainerStyle = {
    borderColor: theme.disabled,
  };

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
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
        {isTranslating ? (
          <ActivityIndicator size="large" color={theme.tint} />
        ) : translationResult ? (
          translationResult.error ? (
            <Text style={[styles.errorText, { color: '#e74c3c' }]}>{translationResult.error}</Text>
          ) : (
            <>
              {/* --- ГЛАВНАЯ КАРТОЧКА ПЕРЕВОДА --- */}
              <View style={[styles.card, cardStyle]}>
                <View style={styles.originalTextContainer}>
                  <Text style={[styles.originalText, { color: theme.tint }]}>
                    {translationResult.original_text}
                  </Text>
                  <TouchableOpacity
                    style={styles.speakButton}
                    onPress={() => onSpeak(
                      translationResult.original_text,
                      `word-${translationResult.original_text}`,
                      bookLanguage
                    )}
                  >
                    <Ionicons name="volume-medium-outline" size={28} color={theme.tint} />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.translatedText, { color: theme.text }]}>
                  {translationResult.translated_text}
                </Text>
              </View>

              {/* --- БЛОК АЛЬТЕРНАТИВ (если есть) --- */}
              {hasAlternatives && (
                <View style={[styles.alternativesContainer, alternativesContainerStyle]}>
                  <Text style={[styles.alternativesTitle, { color: theme.disabled }]}>
                    OTHER OPTIONS
                  </Text>
                  <Text style={[styles.alternativesText, { color: theme.text }]}>
                    {translationResult.alternatives.join('  •  ')}
                  </Text>
                </View>
              )}
              
              {/* --- НОВАЯ КНОПКА ДЛЯ СОЗДАНИЯ КАРТОЧКИ --- */}
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: theme.tint }]}
                onPress={onAddToFlashcards}
              >
                <Ionicons name="add-circle-outline" size={22} color="#fff" />
                <Text style={styles.addButtonText}>Create a card</Text>
              </TouchableOpacity>


              {/* --- Мета-информация в футере панели --- */}
              <Text style={[styles.metaText, { color: theme.disabled }]}>
                {`Translated by ${translationResult.service}`}
              </Text>
            </>
          )
        ) : null}
      </BottomSheetScrollView>
    </BottomSheet>
  );
};

// Стили
const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
    paddingBottom: 60, // Увеличим отступ снизу для кнопки
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  originalTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    paddingBottom: 15,
    marginBottom: 15,
    width: '100%',
  },
  originalText: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 15,
  },
  speakButton: {
    padding: 5,
  },
  translatedText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  alternativesContainer: {
    width: '100%',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  alternativesTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  alternativesText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  // Новые стили для кнопки
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20, // Отступ сверху от блока альтернатив
    width: '100%',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Стиль для мета-информации
  metaText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default TranslationBottomSheet;