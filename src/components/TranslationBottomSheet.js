// file: components/TranslationBottomSheet.js

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

const TranslationBottomSheet = ({ bottomSheetRef, isTranslating, translationResult, theme, onChange }) => {
  const snapPoints = React.useMemo(() => ['25%', '50%'], []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Начинаем в скрытом состоянии
      snapPoints={snapPoints}
      onChange={onChange} // Обработчик для отслеживания закрытия
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
              <Text style={[styles.originalText, { color: theme.tint }]}>
                {translationResult.original_text}
              </Text>
              <Text style={[styles.translatedText, { color: theme.text }]}>
                {translationResult.translated_text}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.disabled }]} />
              <Text style={[styles.metaText, { color: theme.disabled }]}>
                {`Переведено с ${translationResult.source_language_name} • ${translationResult.service_name}`}
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
  originalText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
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

