// file: src/components/TextChunk.js

import React, { useMemo, useCallback, useContext } from 'react';
import { Text, StyleSheet } from 'react-native';
import { parseContentToWords } from '../utils/textParser';
import { SelectionContext } from '../contexts/SelectionContext';

// Компонент Word остается без изменений, он идеален
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

// Возвращаем TextChunk к его интерактивной версии
const TextChunk = ({ content, onWordPress, style, chunkIndex, wrapperProps }) => {
    const words = useMemo(() => parseContentToWords(content), [content]);

    return (
        <Text style={style} {...wrapperProps}>
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
            <Text>{' '}</Text>
        </Text>
    );
};

export default React.memo(TextChunk);

const styles = StyleSheet.create({
    selectedWord: {
        backgroundColor: 'rgba(52, 152, 219, 0.3)',
        borderRadius: 3,
    },
});