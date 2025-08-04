// file: src/components/TextChunk.js

import React, { useMemo, useCallback, useContext, useState } from 'react';
// ИЗМЕНЕНО: Добавляем View, TouchableOpacity, ActivityIndicator и Ionicons
import { Text, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseContentToWords } from '../utils/textParser';
import { SelectionContext } from '../contexts/SelectionContext';

// Компонент Word остается АБСОЛЮТНО без изменений.
// Он по-прежнему отвечает за перевод отдельного слова.
const Word = React.memo(({ text, onWordPress, chunkIndex, wordIndex }) => {
    const { selectedWord } = useContext(SelectionContext);

    const isSelected = useMemo(() => (
        selectedWord &&
        selectedWord.chunkIndex === chunkIndex &&
        selectedWord.wordIndex === wordIndex
    ), [selectedWord, chunkIndex, wordIndex]);

    const handlePress = useCallback(() => {
        onWordPress(text, chunkIndex, wordIndex);
    }, [text, chunkIndex, wordIndex, onWordPress]);

    return (
        <Text onPress={handlePress} style={isSelected ? styles.selectedWord : null}>
            {text}
        </Text>
    );
});


// ИЗМЕНЕНО: TextChunk полностью переработан
const TextChunk = ({ content, onWordPress, style, chunkIndex, theme, onTranslateRequest, translationState }) => {
    // Эта логика для разбора на слова остается
    const words = useMemo(() => parseContentToWords(content), [content]);
    
    // ДОБАВЛЕНО: Локальное состояние для управления видимостью блока с переводом
    const [isTranslationVisible, setIsTranslationVisible] = useState(false);

    // ДОБАВЛЕНО: Обработчик нажатия на кнопку перевода
    const handleTranslatePress = useCallback(() => {
        // Если перевода еще нет в глобальном стейте, запрашиваем его
        if (!translationState) {
            onTranslateRequest();
        }
        // Переключаем локальную видимость блока с переводом
        setIsTranslationVisible(prev => !prev);
    }, [translationState, onTranslateRequest]);

    return (
        // ИЗМЕНЕНО: Все обернуто во View для гибкой верстки
        <View style={styles.chunkContainer}>
            <View style={styles.originalContentWrapper}>
                {/* Оригинальный текст с кликабельными словами. Внешний вид задается через `style` */}
                <Text style={[style, styles.textBlock]}>
                    {words.map((wordData, mapIndex) => {
                        if (wordData.type === 'word') {
                            return (
                                <Word
                                    key={`word-${wordData.wordIndex}`}
                                    text={wordData.text}
                                    onWordPress={onWordPress}
                                    chunkIndex={chunkIndex}
                                    wordIndex={wordData.wordIndex}
                                />
                            );
                        }
                        return <Text key={`space-${mapIndex}`}>{wordData.text}</Text>;
                    })}
                </Text>

                {/* ДОБАВЛЕНО: Кнопка для перевода всего чанка */}
                <TouchableOpacity onPress={handleTranslatePress} style={styles.translateButton}>
                    <Ionicons name="language-outline" size={22} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {/* ДОБАВЛЕНО: Условный рендеринг блока с результатом перевода */}
            {isTranslationVisible && translationState && (
                <View style={[styles.translationContainer, { borderColor: theme.tint, backgroundColor: 'rgba(128, 128, 128, 0.08)' }]}>
                    {translationState.isTranslating ? (
                        <ActivityIndicator color={theme.tint} />
                    ) : translationState.error ? (
                        <Text style={[styles.translationText, { color: 'red' }]}>{translationState.error}</Text>
                    ) : (
                        <Text style={[styles.translationText, { color: theme.text }]}>{translationState.text}</Text>
                    )}
                </View>
            )}
        </View>
    );
};

export default React.memo(TextChunk);

// ИЗМЕНЕНО: Добавлены новые стили и обновлены старые
const styles = StyleSheet.create({
    selectedWord: {
        backgroundColor: 'rgba(52, 152, 219, 0.3)',
        borderRadius: 3,
    },
    chunkContainer: {
        marginBottom: 4, // Небольшой отступ между предложениями
    },
    originalContentWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    textBlock: {
        flex: 1, // Позволяет тексту занимать все доступное место по ширине
        marginRight: 8, // Отступ справа от кнопки перевода
    },
    translateButton: {
        paddingTop: 8, // Смещаем кнопку немного вниз для лучшего визуального выравнивания
        paddingHorizontal: 4,
    },
    translationContainer: {
        marginTop: 8,
        padding: 10,
        borderLeftWidth: 2,
        borderRadius: 4,
        marginBottom: 8,
    },
    translationText: {
        fontStyle: 'italic',
        fontSize: 14, // Перевод делаем немного меньше основного текста
    }
});