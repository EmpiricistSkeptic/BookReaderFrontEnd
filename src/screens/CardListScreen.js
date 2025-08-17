// CardListScreen.js
import React, { useCallback, useState, useEffect, useRef } from 'react';
import { 
    View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Animated, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { apiRequest } from '../services/ApiService';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { formatNextReviewDate } from '../utils/formatNextReviewDate';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EditCardModal from '../components/EditCardModal';
import { FlashList } from '@shopify/flash-list';

const CardItem = React.memo(({ item, onDelete, onEdit, shouldAnimate }) => {
    const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
    const slideAnim = useRef(new Animated.Value(shouldAnimate ? 20 : 0)).current;

    useEffect(() => {
        if (shouldAnimate) {
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]).start();
        }
    }, [fadeAnim, slideAnim, shouldAnimate]);

    const nextReviewText = item.next_review ? formatNextReviewDate(item.next_review) : 'N/A';
    const isDue = item.next_review ? new Date(item.next_review) <= new Date() : false;

    const renderRightActions = () => (
        <View style={styles.swipeActionContainer}>
            <TouchableOpacity style={[styles.swipeButton, styles.editButton]} onPress={onEdit}>
                <Ionicons name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.swipeButton, styles.deleteButton]} onPress={onDelete}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
            </TouchableOpacity>
        </View>
    );

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
                <TouchableOpacity activeOpacity={0.9} onPress={onEdit}>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.cardMainInfo}>
                                <Text style={styles.word}>{item.word || 'No word'}</Text>
                                <Text style={styles.translation}>{item.translation || 'No translation'}</Text>
                            </View>
                            <Text style={[styles.nextReviewText, { color: isDue ? '#4ade80' : 'rgba(255,255,255,0.6)' }]}>
                                {nextReviewText}
                            </Text>
                        </View>
                        {item.example && typeof item.example === 'string' && item.example.trim() !== '' ? (
                            <Text style={styles.example} numberOfLines={3} ellipsizeMode="tail">"{item.example}"</Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
            </Swipeable>
        </Animated.View>
    );
});

export default function CardListScreen({ route }) {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const { title = 'Cards', filter = {} } = route.params || {};
    
    // Состояния
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMoreLoading, setIsMoreLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasNextPage, setHasNextPage] = useState(false);
    const [isEditModalVisible, setEditModalVisible] = useState(false);
    const [selectedCard, setSelectedCard] = useState(null);

    // useRef для отслеживания видимых элементов для анимации
    const viewableItems = useRef(new Set());
    const onViewableItemsChanged = useCallback(({ viewableItems: currentViewable }) => {
        currentViewable.forEach(({ item }) => { 
            if (item) viewableItems.current.add(item.id); 
        });
    }, []);

    const fetchCards = useCallback(async (page, params) => {
        if (page > 1 && isMoreLoading) return;
        if (page === 1) setIsLoading(true); else setIsMoreLoading(true);
        try {
            const queryParams = new URLSearchParams({ page, ...params }).toString();
            const endpoint = `/flashcards/?${queryParams}`;
            const response = await apiRequest(endpoint, 'GET');
            setCards(prevCards => {
                const newCards = response.results || [];
                if (page === 1) return newCards;
                const existingIds = new Set(prevCards.map(c => c.id));
                const uniqueNewCards = newCards.filter(c => !existingIds.has(c.id));
                return [...prevCards, ...uniqueNewCards];
            });
            setHasNextPage(response.next !== null);
            setCurrentPage(page);
        } catch (error) {
            Alert.alert('Error', 'Failed to load card list.');
        } finally {
            setIsLoading(false);
            setIsMoreLoading(false);
        }
    }, [isMoreLoading]);

    useEffect(() => {
        fetchCards(1, filter);
    }, [filter]);

    const handleLoadMore = () => {
        if (hasNextPage && !isMoreLoading) {
            fetchCards(currentPage + 1, filter);
        }
    };

    const handleDelete = useCallback((cardId) => {
        Alert.alert('Delete card?', 'This action cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await apiRequest(`/flashcards/${cardId}/`, 'DELETE');
                        setCards(prev => prev.filter(card => card.id !== cardId));
                    } catch (error) { Alert.alert('Error', 'Failed to delete card.'); }
                }
            }
        ]);
    }, []);

    const handleEdit = useCallback((card) => {
        setSelectedCard(card);
        setEditModalVisible(true);
    }, []);

    const handleCardUpdated = useCallback((updatedCard) => {
        setCards(prevCards => 
            prevCards.map(card => card.id === updatedCard.id ? updatedCard : card)
        );
        setEditModalVisible(false);
        setSelectedCard(null);
    }, []);

    const renderItem = useCallback(({ item }) => (
        <CardItem 
            item={item}
            onDelete={() => handleDelete(item.id)}
            onEdit={() => handleEdit(item)}
            shouldAnimate={!viewableItems.current.has(item.id)}
        />
    ), [handleDelete, handleEdit]);

    if (isLoading && cards.length === 0) {
        return (
            <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.loaderContainer}>
                <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
        );
    }
    
    const renderEmptyListComponent = () => (
        <View style={styles.emptyListContainer}>
            <Text style={styles.emptyText}>There are no cards here yet.</Text>
        </View>
    );

    const renderFooterComponent = () => {
        if (!isMoreLoading) return null;
        return <ActivityIndicator color="#fff" style={{ marginVertical: 20 }} />;
    };

    const TAB_BAR_HEIGHT = 50;

    return (
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={[styles.backButton, { marginTop: 6 }]} // чуть ниже
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={['#2b6cb0', '#2563eb']} style={styles.backInner}>
                        <Ionicons name="arrow-back" size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.titleWrapper}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

                    {/* градиентная линия-underline для выразительности */}
                    <LinearGradient
                        colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.06)']}
                        start={[0, 0]}
                        end={[1, 0]}
                        style={styles.titleUnderline}
                    />
                </View>

                {/* Placeholder to keep title centered */}
                <View style={{ width: 44 }} />
            </View>

            <FlashList
                data={cards}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                estimatedItemSize={130} 
                contentContainerStyle={[
                    cards.length > 0 ? styles.list : { flex: 1 }, 
                    { paddingBottom: insets.bottom + TAB_BAR_HEIGHT }
                ]}
                ListEmptyComponent={renderEmptyListComponent}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.8}
                ListFooterComponent={renderFooterComponent}
                onViewableItemsChanged={onViewableItemsChanged}
            />

            {selectedCard && (
                <EditCardModal
                    visible={isEditModalVisible}
                    onClose={() => {
                        setEditModalVisible(false);
                        setSelectedCard(null);
                    }}
                    onCardUpdated={handleCardUpdated}
                    initialData={selectedCard}
                />
            )}
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingBottom: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.06)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 10,
            },
            android: {
                elevation: 2,
            }
        })
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backInner: {
        width: 40,
        height: 40,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
    },
    titleWrapper: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.4,
        textAlign: 'center',
        // лёгкая тень для выразительности (работает в iOS; на Android часть эффекта видна)
        textShadowColor: 'rgba(0,0,0,0.45)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        marginBottom: 6,
    },
    titleUnderline: {
        width: 140,
        height: 3,
        borderRadius: 3,
        marginTop: 2,
    },

    list: { 
        paddingTop: 15,
        paddingHorizontal: 15,
    },
    emptyListContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: { color: '#fff', fontSize: 18, opacity: 0.8 },

    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardMainInfo: { flex: 1 },
    nextReviewText: {
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'right',
        marginLeft: 10,
    },
    word: { 
        fontSize: 20, 
        fontWeight: '600', 
        color: '#fff',
        marginRight: 5,
    },
    translation: { 
        fontSize: 16, 
        color: 'rgba(255,255,255,0.8)', 
        marginTop: 5 
    },
    example: { 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.7)', 
        fontStyle: 'italic', 
        marginTop: 10, 
        borderLeftColor: 'rgba(255,255,255,0.4)', 
        borderLeftWidth: 3, 
        paddingLeft: 10
    },

    swipeActionContainer: {
        flexDirection: 'row',
        width: 140,
        height: '100%',
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


