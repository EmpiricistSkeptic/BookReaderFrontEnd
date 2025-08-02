// screens/CardListScreen.js

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { apiRequest } from '../services/ApiService';
import { LinearGradient } from 'expo-linear-gradient';

const CardItem = ({ item }) => (
    <View style={styles.card}>
        <Text style={styles.word}>{item.word}</Text>
        <Text style={styles.translation}>{item.translation}</Text>
        {item.example ? <Text style={styles.example}>"{item.example}"</Text> : null}
    </View>
);

export default function CardListScreen({ route, navigation }) {
    // <-- ИЗМЕНЕНИЕ 1: Добавляем безопасную проверку на случай, если route.params не существует
    const { title = 'Карточки', filter = {} } = route.params || {};
    
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        navigation.setOptions({ title });

        const fetchCards = async () => {
            setIsLoading(true);
            try {
                const queryString = new URLSearchParams(filter).toString();
                const data = await apiRequest(`/flashcards/?${queryString}`, 'GET');

                // <-- ИЗМЕНЕНИЕ 2: Добавляем надежную проверку ответа от API
                // Этот блок кода не даст приложению упасть.
                if (data && Array.isArray(data.results)) {
                    // Случай 1: Пагинация включена, данные в поле 'results'
                    setCards(data.results);
                } else if (Array.isArray(data)) {
                    // Случай 2: Пагинация выключена, API вернул просто массив
                    setCards(data);
                } else {
                    // Случай 3: Пришел некорректный ответ (не объект, не массив)
                    // Устанавливаем пустой массив, чтобы избежать падения FlatList
                    console.warn("Получен некорректный формат данных от API:", data);
                    setCards([]);
                }
                
            } catch (error) {
                // В случае ошибки также устанавливаем пустой массив
                setCards([]); 
                Alert.alert('Ошибка', 'Не удалось загрузить список карточек.');
                console.error("Failed to fetch cards:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCards();
    }, [title, filter, navigation]); // <-- ИЗМЕНЕНИЕ 3: Добавляем 'navigation' в массив зависимостей

    if (isLoading) {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
        );
    }
    
    // <-- ИЗМЕНЕНИЕ 4: Проверяем именно 'cards' на случай, если он стал null или undefined
    if (!cards || cards.length === 0) {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.loaderContainer}>
                <Text style={styles.emptyText}>Здесь пока нет карточек</Text>
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            <FlatList
                data={cards}
                renderItem={({ item }) => <CardItem item={item} />}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.list}
            />
        </LinearGradient>
    );
}

// Стили остаются без изменений
const styles = StyleSheet.create({
    container: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 10 },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 10,
        padding: 20,
        marginBottom: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
    },
    word: { fontSize: 18, fontWeight: 'bold', color: '#1e3c72' },
    translation: { fontSize: 16, color: '#333', marginTop: 5 },
    example: { fontSize: 14, color: '#555', fontStyle: 'italic', marginTop: 10, borderLeftColor: '#ccc', borderLeftWidth: 3, paddingLeft: 10},
    emptyText: { color: '#fff', fontSize: 18 }
});