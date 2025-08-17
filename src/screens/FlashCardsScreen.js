import React, { useState, useCallback, useEffect } from 'react';
import {
    View, StyleSheet, Alert, TouchableOpacity
} from 'react-native';
// --- ИЗМЕНЕНИЕ 1: Импортируем хук для навигации ---
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/ApiService';

// --- ИЗМЕНЕНИЕ 2: Удаляем импорты SessionView и CompletedView, они больше здесь не нужны ---
import StatsView from '../components/flashcards/StatsView';
import AddCardModal from '../components/AddCardModal';

export default function FlashCardsScreen() {
    // --- ИЗМЕНЕНИЕ 3: Получаем доступ к навигации ---
    const navigation = useNavigation();

    // Состояния, которые остаются:
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [isModalVisible, setModalVisible] = useState(false);
    
    // --- ИЗМЕНЕНИЕ 4: Удаляем состояния sessionState и cards. Ими теперь управляет навигатор. ---

    // Логика API
    const fetchStats = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await apiRequest('/flashcards/stats/', 'GET');
            setStats(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load statistics.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // useFocusEffect теперь просто обновляет статистику при каждом заходе на экран
    useFocusEffect(useCallback(() => {
        fetchStats();
    }, [fetchStats]));

    // --- ИЗМЕНЕНИЕ 5: Переписываем функцию запуска сессии ---
    const handleStartSession = async () => {
        if (!stats || stats.due_today === 0) {
            Alert.alert("All caught up!", "You have no cards to review today.");
            return;
        }
        setIsLoading(true);
        try {
            // Запрашиваем только карточки, которые готовы к показу сегодня
            const data = await apiRequest('/flashcards/?is_due=true', 'GET');
            const cardsToReview = data.results || data;

            if (cardsToReview && cardsToReview.length > 0) {
                // Выполняем НАВИГАЦИЮ на экран 'Session' и передаем ему карточки
                navigation.navigate('Session', { cards: cardsToReview });
            } else {
                Alert.alert('Great!', 'There are no cards to study today.');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to start session.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- ИЗМЕНЕНИЕ 6: Эта функция теперь отвечает за переход на экран списка ---
    const handleChipPress = (title, filter) => {
        // Выполняем НАВИГАЦИЮ на экран 'CardList' и передаем ему заголовок и фильтры
        navigation.navigate('CardList', { title, filter });
    };

    // --- ИЗМЕНЕНИЕ 7: Удаляем все старые функции: handleSubmitAnswer, removeCardFromSession,
    // handleSessionComplete, resetSession и renderContent. Они больше не нужны. ---

    return (
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            {/* 
              Теперь этот экран ВСЕГДА рендерит только StatsView.
              Мы передаем ему новые функции для управления навигацией.
            */}
            <StatsView
                stats={stats}
                isLoading={isLoading}
                onStartSession={handleStartSession}
                onChipPress={handleChipPress}
            />
            
            {/* Логика плавающей кнопки и модального окна остается без изменений */}
            {!isLoading && (
                <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={32} color="#fff" />
                </TouchableOpacity>
            )}
            
            <AddCardModal
                visible={isModalVisible}
                onClose={() => setModalVisible(false)}
                onCardAdded={() => {
                    setModalVisible(false);
                    fetchStats(); // Обновляем статистику после добавления
                }}
            />
        </LinearGradient>
    );
}

// --- СТИЛИ ---
// Стили остаются без изменений, так как они относятся к контейнеру и кнопке
const styles = StyleSheet.create({
    container: { flex: 1 },
    fab: {
        position: 'absolute',
        right: 25,
        bottom: 100,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#1e3c72',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)'
    },
});