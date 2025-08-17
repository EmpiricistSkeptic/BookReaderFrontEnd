// src/components/EditCardModal.js

import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, StyleSheet, Modal, TouchableOpacity,
    ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/ApiService';

export default function EditCardModal({ visible, onClose, onCardUpdated, initialData }) {
    // Если нет initialData, компонент не должен рендериться, но на всякий случай
    if (!initialData) return null;

    const [word, setWord] = useState('');
    const [translation, setTranslation] = useState('');
    const [example, setExample] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Заполняем поля, когда компонент становится видимым
    useEffect(() => {
        if (initialData) {
            setWord(initialData.word || '');
            setTranslation(initialData.translation || '');
            setExample(initialData.example || '');
            setErrors({});
        }
    }, [initialData, visible]);

    const validateFields = () => {
        const newErrors = {};
        if (!word.trim()) newErrors.word = 'Word is required.';
        if (!translation.trim()) newErrors.translation = 'Translation is required.';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateFields()) return;
        setIsLoading(true);

        const cardData = {
            word: word.trim(),
            translation: translation.trim(),
            example: example.trim(),
        };

        try {
            const endpoint = `/flashcards/${initialData.id}/`;
            const response = await apiRequest(endpoint, 'PATCH', cardData);
            
            Alert.alert('Success', 'The card has been updated.');
            if (onCardUpdated) onCardUpdated(response); // Вызываем колбэк с обновленными данными
            onClose(); // Закрываем окно

        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to save the card.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Edit Card</Text>
                        
                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Word"
                                value={word}
                                onChangeText={setWord}
                                style={[styles.input, errors.word && styles.inputError]}
                                placeholderTextColor="#888"
                            />
                            {errors.word && <Text style={styles.errorText}>{errors.word}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Translation"
                                value={translation}
                                onChangeText={setTranslation}
                                style={[styles.input, errors.translation && styles.inputError]}
                                placeholderTextColor="#888"
                            />
                            {errors.translation && <Text style={styles.errorText}>{errors.translation}</Text>}
                        </View>

                        <View style={styles.inputContainer}>
                            <TextInput
                                placeholder="Example (optional)"
                                value={example}
                                onChangeText={setExample}
                                style={styles.input}
                                placeholderTextColor="#888"
                                multiline
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark" size={20} color="#fff" />
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isLoading}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </KeyboardAvoidingView>
        </Modal>
    );
}

// Стили можно скопировать из AddCardModal
const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#2a5298',
        marginBottom: 20,
    },
    inputContainer: {
        width: '100%',
        marginBottom: 15,
    },
    input: {
        width: '100%',
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    inputError: {
        borderColor: '#e74c3c',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 12,
        marginTop: 4,
        marginLeft: 5,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a5298',
        paddingVertical: 15,
        borderRadius: 12,
        justifyContent: 'center',
        width: '100%',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    cancelButton: {
        paddingVertical: 15,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
});