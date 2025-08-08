import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getConversations, createConversation, deleteConversation } from '../services/ConversationService';

// Компонент карточки диалога с новым дизайном
const ConversationItem = ({ item, onPress, onDelete }) => {
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
        <Animated.View style={{ transform: [{ translateX: trans }] }}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.itemOuterContainer}>
      <Swipeable renderRightActions={renderRightActions}>
        <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item.id)}>
          <LinearGradient
            colors={['#4a72d8', '#2a5298']}
            style={styles.itemIcon}>
            <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
          </LinearGradient>
          <View style={styles.itemContent}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title || `Dialogue #${item.id}`}
            </Text>
            <Text style={styles.itemSubtitle}>
              {item.messages_count ? `${item.messages_count} messages` : 'No messages'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
};


export default function AIAssistantScreen({ navigation }) {
  // Получаем точные отступы для текущего устройства
  const insets = useSafeAreaInsets();

  // Ваша оригинальная логика состояния
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Ваша оригинальная логика загрузки данных
  const loadConversations = async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch (error) {
      console.error("Ошибка загрузки диалогов:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Ваша оригинальная логика useFocusEffect
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations();
    }, [])
  );

  // Ваша оригинальная логика обновления списка
  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  // Ваша оригинальная логика создания диалога
  const handleNewConversation = async () => {
    try {
      const newConversation = await createConversation();
      navigation.navigate('Conversation', { conversationId: newConversation.id });
    } catch (error) {
      console.error("Ошибка создания диалога:", error);
    }
  };

  // Ваша оригинальная логика удаления диалога
  const handleDelete = (conversationId) => {
    Alert.alert(
      "Delete dialogue?",
      "This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteConversation(conversationId);
              setConversations(prev => prev.filter(c => c.id !== conversationId));
            } catch (error) {
              console.error("Error deleting dialog:", error);
              Alert.alert("Error", "Failed to delete dialog. Try again.");
            }
          } 
        }
      ]
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
        <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Your dialogues with the AI teacher</Text>
              <View style={styles.headerDecorator} />
            </View>

            <FlatList
                data={conversations}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <ConversationItem
                        item={item}
                        onPress={(conversationId) => navigation.navigate('Conversation', { conversationId })}
                        onDelete={() => handleDelete(item.id)}
                    />
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                    <Ionicons name="planet-outline" size={80} color="rgba(255,255,255,0.4)" />
                    <Text style={styles.emptyText}>No Dialogues Yet</Text>
                    <Text style={styles.emptySubText}>Tap the + button to start a new conversation!</Text>
                    </View>
                }
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: insets.bottom + 120 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
                }
            />

            <TouchableOpacity onPress={handleNewConversation} style={[styles.fabContainer, { bottom: insets.bottom + 45 }]}>
                <LinearGradient
                    colors={['#4a72d8', '#2a5298']}
                    style={styles.fab}>
                    <Ionicons name="add" size={32} color="#fff" />
                </LinearGradient>
            </TouchableOpacity>
        </LinearGradient>
    </GestureHandlerRootView>
  );
}

// Новые, переработанные стили
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingBottom: 20,
        paddingHorizontal: 25,
    },
    headerTitle: {
        fontSize: 34,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'left',
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'left',
        marginTop: 8,
    },
    headerDecorator: {
      height: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      borderRadius: 1,
      marginTop: 25,
      width: '40%',
    },
    itemOuterContainer: {
      marginBottom: 15,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 10,
      elevation: 5,
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        padding: 12,
        overflow: 'hidden',
    },
    itemIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
    },
    itemSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 3,
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: '30%',
        opacity: 0.8,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 8,
        textAlign: 'center',
        paddingHorizontal: 30,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
    },
    fab: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    deleteButton: {
      backgroundColor: '#ff3b30',
      justifyContent: 'center',
      alignItems: 'center',
      width: 80,
      borderRadius: 16,
      marginLeft: -16,
    }
});