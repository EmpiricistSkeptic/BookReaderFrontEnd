// file: screens/FlashCardsScreen.js

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated,
    Dimensions, Alert, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/ApiService';

// Компоненты
import StatsView from '../components/flashcards/StatsView';
import SessionView from '../components/flashcards/SessionView';
import CompletedView from '../components/flashcards/CompletedView';

const { height } = Dimensions.get('window');

// --- Компонент модального окна AddCardModal остается почти без изменений ---
// Он хорошо спроектирован и его логика по-прежнему актуальна.
const AddCardModal = ({ visible, onClose, onCardAdded }) => {
    // ... (Ваш код для AddCardModal остается здесь, он корректен)
    const [word, setWord] = useState('');
    const [translation, setTranslation] = useState('');
    const [example, setExample] = useState('');
    const [suggestedExamples, setSuggestedExamples] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimeout = useRef(null);

    useEffect(() => {
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        if (word.trim().length > 1) {
            debounceTimeout.current = setTimeout(async () => {
                setIsSuggesting(true);
                setSuggestedExamples([]);
                try {
                    const suggestions = await apiRequest('/flashcards/get-suggestions/', 'POST', { word: word.trim() });
                    if (suggestions) {
                        setTranslation(suggestions.translation || '');
                        setSuggestedExamples(suggestions.examples || []);
                    }
                } catch (error) {
                    console.error("Suggestion fetch error:", error);
                } finally {
                    setIsSuggesting(false);
                }
            }, 750);
        } else {
            setSuggestedExamples([]);
        }
        return () => { if (debounceTimeout.current) clearTimeout(debounceTimeout.current) };
    }, [word]);

    const handleSave = async () => {
        if (!word.trim() || !translation.trim()) {
            Alert.alert('Ошибка', 'Поля "Слово" и "Перевод" обязательны.');
            return;
        }
        setIsSaving(true);
        try {
            await apiRequest('/flashcards/', 'POST', { word: word.trim(), translation: translation.trim(), example: example.trim() });
            Alert.alert('Успех!', 'Карточка успешно добавлена.');
            handleClose();
            onCardAdded();
        } catch (error) {
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось сохранить карточку.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setWord(''); setTranslation(''); setExample(''); setSuggestedExamples([]);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        onClose();
    }

    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Новая карточка</Text>
                        <TouchableOpacity onPress={handleClose}><Ionicons name="close-circle" size={30} color="#ccc" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={styles.inputLabel}>Слово или фраза</Text>
                        <TextInput style={styles.textInput} placeholder="Начните вводить слово..." placeholderTextColor="#999" value={word} onChangeText={setWord} />
                        <Text style={styles.inputLabel}>Перевод</Text>
                        <View style={styles.inputContainer}>
                            <TextInput style={[styles.textInput, {flex: 1}]} placeholder="Перевод появится здесь" placeholderTextColor="#999" value={translation} onChangeText={setTranslation} />
                            {isSuggesting && <ActivityIndicator style={{marginLeft: 10}} color="#2a5298"/>}
                        </View>
                        <Text style={styles.inputLabel}>Пример использования</Text>
                        <TextInput style={[styles.textInput, {height: 80, textAlignVertical: 'top'}]} placeholder="Выберите пример или введите свой" placeholderTextColor="#999" value={example} onChangeText={setExample} multiline/>
                        {isSuggesting && suggestedExamples.length === 0 && <ActivityIndicator style={{marginVertical: 10}} color="#2a5298"/>}
                        {suggestedExamples.length > 0 && (
                            <View>
                                {suggestedExamples.map((ex, index) => (
                                    <TouchableOpacity key={index} style={styles.suggestionChip} onPress={() => setExample(ex)}>
                                        <Text style={styles.suggestionText}>{ex}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving || isSuggesting}>
                        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Сохранить карточку</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

// --- ОСНОВНОЙ КОМПОНЕНТ ЭКРАНА С ОБНОВЛЕННОЙ ЛОГИКОЙ ---
export default function FlashCardsScreen() {
    const navigation = useNavigation();
    
    // --- Состояния ---
    const [sessionState, setSessionState] = useState('stats');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [cards, setCards] = useState([]);
    const [isModalVisible, setModalVisible] = useState(false);

    // --- Логика API ---
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest('/flashcards/stats/', 'GET');
            setStats(data);
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось загрузить статистику.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        if (sessionState === 'stats') {
            fetchStats();
        }
    }, [sessionState, fetchStats]));

    // ИЗМЕНЕНИЕ 1: Функция startSession теперь использует фильтр is_due
    const startSession = async () => {
        setIsLoading(true);
        try {
            // Новый эндпоинт для получения карточек на сегодня
            const data = await apiRequest('/flashcards/?is_due=true', 'GET');
            
            // Ответ от Django REST Framework с пагинацией имеет поле 'results'
            const cardsToReview = data.results || data; 

            if (cardsToReview && cardsToReview.length > 0) {
                setCards(cardsToReview);
                setSessionState('in_progress');
            } else {
                Alert.alert('Отлично!', 'Карточек для изучения на сегодня нет.');
            }
        } catch (error) {
            Alert.alert('Ошибка', 'Не удалось начать сессию.');
        } finally {
            setIsLoading(false);
        }
    };

    // ИЗМЕНЕНИЕ 2: Новая функция для обработки ответа (знаю/не знаю)
    // Эта функция будет вызываться из SessionView после свайпа
    const handleSubmitAnswer = async (cardId, knows) => {
        try {
            // Новый эндпоинт и тело запроса
            await apiRequest(`/flashcards/${cardId}/answer/`, 'POST', { knows });
        } catch (e) {
            Alert.alert('Ошибка', 'Не удалось сохранить ответ. Карточка будет показана снова.');
            // В случае ошибки можно вернуть карточку в конец колоды или показать позже.
            // Пока просто выводим сообщение.
        }
    };

    // ИЗМЕНЕНИЕ 3: Функция для удаления карточки из текущей сессии
    // SessionView вызовет эту функцию, когда карточка "улетит" с экрана
    const removeCardFromSession = (cardId) => {
        setCards(prevCards => prevCards.filter(card => card.id !== cardId));
    };

    const handleSessionComplete = () => {
        setSessionState('completed');
    };

    const resetSession = () => {
        setSessionState('stats');
        setCards([]);
        fetchStats(); // Обновляем статистику после сброса сессии
    };

    // ИЗМЕНЕНИЕ 4: Адаптируем handleChipPress под новую логику (если понадобится)
    // Текущая логика по-прежнему работает, но можно сделать ее более явной
    const handleChipPress = (title, filter, ordering = 'next_review') => {
        navigation.navigate('CardList', { title, filter: { ...filter, ordering } });
    };

    // --- Управляющая рендер-функция ---
    const renderContent = () => {
        switch(sessionState) {
            case 'stats':
                return (
                    <StatsView
                        stats={stats}
                        isLoading={isLoading}
                        onStartSession={startSession}
                        onChipPress={handleChipPress}
                    />
                );
            case 'in_progress':
                return (
                    <SessionView
                        // Передаем колоду карточек
                        cards={cards}
                        // Передаем функцию, которая будет вызвана после свайпа
                        onSubmitAnswer={handleSubmitAnswer}
                        // Передаем функцию для удаления карточки из стейта после "улетания"
                        onCardRemoved={removeCardFromSession}
                        // Передаем функцию для вызова, когда колода закончится
                        onSessionComplete={handleSessionComplete}
                    />
                );
            case 'completed':
                return <CompletedView onResetSession={resetSession} />;
            default:
                return <ActivityIndicator style={{ flex: 1 }} color="#fff" size="large"/>;
        }
    }

    return (
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            {renderContent()}
            {sessionState === 'stats' && !isLoading && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={32} color="#fff" />
                </TouchableOpacity>
            )}
            <AddCardModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onCardAdded={() => {
                    setModalVisible(false);
                    fetchStats();
                }}
            />
        </LinearGradient>
    );
}

// Стили остаются без изменений
const styles = StyleSheet.create({
    container: { flex: 1 },
    fab: { position: 'absolute', right: 25, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e3c72', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#1e3c72' },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    inputLabel: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 15, fontWeight: '500' },
    textInput: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333' },
    suggestionChip: { padding: 12, backgroundColor: '#e9eef5', borderRadius: 8, marginTop: 8 },
    suggestionText: { color: '#2a5298', fontSize: 15 },
    saveButton: { backgroundColor: '#2a5298', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 25 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});