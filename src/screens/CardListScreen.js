// screens/CardListScreen.js

import React, { useCallback } from 'react';
import { 
    View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity 
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { apiRequest } from '../services/ApiService';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// --- ИЗМЕНЕНИЕ: CardItem теперь отображает статус ---
const CardItem = ({ item, onDelete, onEdit }) => {
    const renderRightActions = () => (
        <View style={styles.swipeActionContainer}>
            <TouchableOpacity style={[styles.swipeButton, styles.editButton]} onPress={onEdit}>
                <Ionicons name="create-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.swipeButton, styles.deleteButton]} onPress={onDelete}>
                <Ionicons name="trash-outline" size={24} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <Swipeable renderRightActions={renderRightActions}>
            <TouchableOpacity activeOpacity={0.8} onPress={onEdit}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={styles.word}>{item.word}</Text>
                            <Text style={styles.translation}>{item.translation}</Text>
                        </View>
                        {/* Добавляем значок статуса */}
                        <View style={[styles.statusIndicator, {backgroundColor: item.is_learning ? '#f0ad4e' : '#5cb85c'}]}>
                            <Ionicons 
                                name={item.is_learning ? "hourglass-outline" : "sync-circle-outline"} 
                                size={14} 
                                color="#fff" 
                            />
                            <Text style={styles.statusText}>{item.is_learning ? 'Изучение' : 'Повтор'}</Text>
                        </View>
                    </View>
                    {item.example ? <Text style={styles.example}>"{item.example}"</Text> : null}
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
};

// --- Основной компонент экрана остается без изменений ---
// Он уже идеально спроектирован для работы с новой логикой
export default function CardListScreen({ route, navigation }) {
    const { title = 'Карточки', filter = {} } = route.params || {};
    
    // --- Состояния ---
    const [cards, setCards] = React.useState([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [nextPage, setNextPage] = React.useState(null);
    const [isFetchingMore, setIsFetchingMore] = React.useState(false);

    const fetchCards = useCallback(async (isInitial = true) => {
        if (!isInitial && !nextPage) return;
        if (isFetchingMore) return;
        
        if (isInitial) setIsLoading(true); else setIsFetchingMore(true);

        try {
            const url = isInitial 
                ? `/flashcards/?${new URLSearchParams(filter).toString()}` 
                : nextPage.replace(/^http:/, 'https:');
            
            const data = await apiRequest(url, 'GET');

            if (data && Array.isArray(data.results)) {
                setCards(prev => isInitial ? data.results : [...prev, ...data.results]);
                setNextPage(data.next);
            } else if (isInitial && Array.isArray(data)) { // Для API без пагинации
                setCards(data);
                setNextPage(null);
            } else if (isInitial) {
                console.warn("Получен некорректный формат данных от API:", data);
                setCards([]);
            }
        } catch (error) {
            if (isInitial) setCards([]);
            Alert.alert('Ошибка', 'Не удалось загрузить список карточек.');
        } finally {
            setIsLoading(false);
            setIsFetchingMore(false);
        }
    }, [filter, nextPage, isFetchingMore]);

    useFocusEffect(
      useCallback(() => {
        navigation.setOptions({ title });
        fetchCards(true);
      }, [title, filter, navigation])
    );

    const handleLoadMore = () => {
        fetchCards(false);
    };

    const handleDelete = (cardId) => {
        Alert.alert('Удалить карточку?', 'Это действие нельзя будет отменить.', [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/flashcards/${cardId}/`, 'DELETE');
                        setCards(prev => prev.filter(card => card.id !== cardId));
                    } catch (error) {
                        Alert.alert('Ошибка', 'Не удалось удалить карточку.');
                    }
                }
            }
        ]);
    };

    const handleEdit = (card) => {
        Alert.alert('Редактирование', `В разработке...`);
    };

    if (isLoading) {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            <FlatList
                data={cards}
                renderItem={({ item }) => (
                    <CardItem 
                        item={item} 
                        onDelete={() => handleDelete(item.id)}
                        onEdit={() => handleEdit(item)}
                    />
                )}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={cards.length > 0 ? styles.list : styles.loaderContainer}
                ListEmptyComponent={<Text style={styles.emptyText}>Здесь пока нет карточек</Text>}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={isFetchingMore ? <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} /> : null}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { padding: 15 },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    // ИЗМЕНЕНИЕ: Стили для отображения статуса
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    statusIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 5,
    },
    word: { fontSize: 20, fontWeight: '600', color: '#fff' },
    translation: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
    example: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.7)', 
        fontStyle: 'italic', 
        marginTop: 10, 
        borderLeftColor: 'rgba(255,255,255,0.4)', 
        borderLeftWidth: 3, 
        paddingLeft: 10
    },
    emptyText: { color: '#fff', fontSize: 18, opacity: 0.8 },
    swipeActionContainer: {
        flexDirection: 'row',
        width: 140,
        marginBottom: 15,
    },
    swipeButton: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: '100%',
    },
    editButton: {
        backgroundColor: '#f0ad4e',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
    },
    deleteButton: {
        backgroundColor: '#d9534f',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
    },
});