import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getConversationDetails, sendMessage } from '../services/ConversationService';
import { useHeaderHeight } from '@react-navigation/elements';

// Компонент для отображения одного сообщения
const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <View style={[
      styles.messageRow,
      isUser ? styles.userMessageRow : styles.aiMessageRow
    ]}>
      <View style={[
        styles.messageBubble,
        isUser ? styles.userMessageBubble : styles.aiMessageBubble
      ]}>
        <Text style={styles.messageText}>{message.content}</Text>
      </View>
    </View>
  );
};

export function ConversationScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const [conversation, setConversation] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [input,        setInput]        = useState('');
  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();

  useEffect(() => {
    const loadConversation = async () => {
      try {
        const data = await getConversationDetails(conversationId);
        setConversation(data);
        setMessages(data.messages);
        if (data.title) {
          navigation.setOptions({ title: data.title });
        }
      } catch (error) {
        console.error("Ошибка загрузки диалога:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConversation();
  }, [conversationId, navigation]);

  const handleSend = async () => {
    if (input.trim().length === 0 || sending) return;

    const userMessageContent = input.trim();
    setInput('');
    setSending(true);

    // Оптимистичное обновление: добавляем сообщение пользователя сразу
    const optimisticUserMessage = {
      id: Date.now(), // Временный ID
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticUserMessage]);

    try {
      const response = await sendMessage(conversationId, userMessageContent);
      
      // Заменяем оптимистичное сообщение на реальное и добавляем ответ AI
      setMessages(prev => [
        ...prev.filter(msg => msg.id !== optimisticUserMessage.id),
        response.user_message,
        response.ai_response,
      ]);

      // Если заголовок не был установлен, обновляем его
      if (!conversation?.title) {
        navigation.setOptions({ title: response.user_message.content.substring(0, 20) + '...' });
      }

    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      // Возвращаем поле ввода и удаляем оптимистичное сообщение в случае ошибки
      setInput(userMessageContent);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMessage.id));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // Автоматическая прокрутка вниз при добавлении новых сообщений
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);


  if (loading) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={{ padding: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Спросите что-нибудь..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (sending || input.trim().length === 0) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={sending || input.trim().length === 0}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageRow: {
        flexDirection: 'row',
        marginVertical: 5,
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    aiMessageRow: {
        justifyContent: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 18,
    },
    userMessageBubble: {
        backgroundColor: '#2a5298',
        borderTopRightRadius: 5,
    },
    aiMessageBubble: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderTopLeftRadius: 5,
    },
    messageText: {
        fontSize: 16,
        color: '#fff',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    input: {
        flex: 1,
        minHeight: 40,
        maxHeight: 120,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 16,
        marginRight: 10,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#2a5298',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(42,82,152,0.5)',
    },
});