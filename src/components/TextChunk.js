import React, { useMemo, useCallback, useContext, useState } from 'react';
import { Text, StyleSheet, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseContentToWords } from '../utils/textParser';
import { SelectionContext } from '../contexts/SelectionContext';

// Компонент Word остается без изменений
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


const TextChunk = ({ 
    content, 
    onWordPress, 
    style, 
    chunkIndex, 
    theme, 
    onTranslateRequest, 
    translationState,
    onSpeak,
    speakingIdentifier,
    bookLanguage
}) => {
    const words = useMemo(() => parseContentToWords(content), [content]);
    const [isTranslationVisible, setIsTranslationVisible] = useState(false);

    const isSpeaking = useMemo(() => speakingIdentifier === `chunk-${chunkIndex}`, [speakingIdentifier, chunkIndex]);

    const handleTranslatePress = useCallback(() => {
        if (!translationState) {
            onTranslateRequest();
        }
        setIsTranslationVisible(prev => !prev);
    }, [translationState, onTranslateRequest]);

    const handleSpeakPress = useCallback(() => {
        onSpeak(content, `chunk-${chunkIndex}`, bookLanguage);
    }, [onSpeak, content, chunkIndex, bookLanguage]);

    return (
        <View style={styles.chunkContainer}>
            {/* --- ИЗМЕНЕНО: Структура для расположения кнопок по бокам --- */}
            <View style={styles.originalContentWrapper}>
                {/* Кнопка для озвучивания чанка (слева) */}
                <TouchableOpacity onPress={handleSpeakPress} style={styles.actionButton}>
                    <Ionicons 
                        name={isSpeaking ? "volume-high" : "volume-medium-outline"} 
                        size={22} 
                        color={isSpeaking ? '#3498db' : theme.tint} 
                    />
                </TouchableOpacity>

                {/* Оригинальный текст с кликабельными словами (в центре) */}
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

                {/* Кнопка для перевода чанка (справа) */}
                <TouchableOpacity onPress={handleTranslatePress} style={styles.actionButton}>
                    <Ionicons name="language-outline" size={22} color={theme.tint} />
                </TouchableOpacity>
            </View>

            {/* Блок с результатом перевода остается без изменений */}
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

const styles = StyleSheet.create({
    selectedWord: {
        backgroundColor: 'rgba(52, 152, 219, 0.3)',
        borderRadius: 3,
    },
    chunkContainer: {
        marginBottom: 4,
    },
    originalContentWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between', // Распределяет элементы: первый слева, последний справа
    },
    textBlock: {
        flex: 1, // Текст занимает все доступное пространство между кнопками
        marginHorizontal: 8, // --- ИЗМЕНЕНО: Отступы слева и справа от текста
    },
    // --- УДАЛЕНО: стиль actionsContainer больше не нужен ---
    actionButton: { // Стиль применяется к обеим кнопкам
        paddingVertical: 6,
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
        fontSize: 14,
    }
});

