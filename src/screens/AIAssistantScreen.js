import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Animated, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
// НОВОЕ: Импортируем Swipeable и нужные сервисы
import { Swipeable } from 'react-native-gesture-handler';
import { getConversations, createConversation, deleteConversation } from '../services/ConversationService';

// НОВОЕ: Компонент элемента списка теперь стал сложнее
const ConversationItem = ({ item, onPress, onDelete }) => {

  // НОВОЕ: Функция, которая рендерит кнопку "Удалить" при свайпе
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
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity style={styles.itemContainer} onPress={() => onPress(item.id)}>
        <View style={styles.itemIcon}>
          <Ionicons name="chatbubbles-outline" size={24} color="#2a5298" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.title || `Dialogue #${item.id}`}
          </Text>
          <Text style={styles.itemSubtitle}>
            {item.messages_count ? `${item.messages_count} messages` : 'No messages'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function AIAssistantScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadConversations();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const handleNewConversation = async () => {
    try {
      const newConversation = await createConversation();
      navigation.navigate('Conversation', { conversationId: newConversation.id });
    } catch (error) {
      console.error("Ошибка создания диалога:", error);
    }
  };

  // НОВОЕ: Функция для обработки удаления диалога
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
              // Оптимистичное обновление: убираем диалог из списка сразу
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
    <View style={styles.container}> 
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={StyleSheet.absoluteFill}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>Your dialogues with the AI teacher</Text>
        </View>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              onPress={(conversationId) => navigation.navigate('Conversation', { conversationId })}
              onDelete={() => handleDelete(item.id)} // НОВОЕ: передаем хендлер удаления
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={60} color="rgba(255,255,255,0.3)" />
              <Text style={styles.emptyText}>You don't have any dialogues yet.</Text>
              <Text style={styles.emptySubText}>Start a new one to practice!</Text>
            </View>
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
          }
        />
      </LinearGradient>

      <TouchableOpacity style={styles.fab} onPress={handleNewConversation}>
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// Стили немного изменились
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
        paddingTop: 70,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 5,
    },
    itemContainer: { // Теперь это внутренний контейнер, который двигается
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        // borderRadius убрали, так как свайп должен быть прямоугольным
    },
    itemIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    itemContent: {
        flex: 1,
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    itemSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginTop: 20,
    },
    emptySubText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 5,
    },
    fab: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#2a5298',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
        zIndex: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)'
    },
    // НОВОЕ: Стиль для кнопки удаления
    deleteButton: {
      backgroundColor: '#ff4444',
      justifyContent: 'center',
      alignItems: 'flex-end',
      width: 80,
    }
});