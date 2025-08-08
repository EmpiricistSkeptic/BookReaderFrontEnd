import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList,
  ActivityIndicator, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager,
  Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getConversationDetails, sendMessage } from '../services/ConversationService';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- НОВЫЙ КОМПОНЕНТ: Приветственный экран для пустого чата ---
const ChatEmptyState = ({ onPromptPress }) => {
  const prompts = [
    { icon: 'checkmark-circle-outline', text: 'Correct my sentence: "I goed to the cinema yesterday."' },
    { icon: 'help-circle-outline', text: 'What is the difference between "affect" and "effect"?' },
    { icon: 'book-outline', text: 'Give me an example of the Past Perfect tense.' },
  ];

  return (
    <View style={styles.emptyStateContainer}>
      <View style={styles.emptyStateAvatar}>
        <Ionicons name="sparkles" size={40} color="#fff" />
      </View>
      <Text style={styles.emptyStateTitle}>Ready to practice?</Text>
      <Text style={styles.emptyStateSubtitle}>
        Ask me anything about the language you're learning. I can correct your mistakes, explain grammar, or give you examples.
      </Text>
      <View style={styles.promptsContainer}>
        <Text style={styles.promptsTitle}>Try asking:</Text>
        {prompts.map((prompt, index) => (
          <TouchableOpacity key={index} style={styles.promptButton} onPress={() => onPromptPress(prompt.text)}>
            <Ionicons name={prompt.icon} size={22} color="rgba(255,255,255,0.7)" style={styles.promptIcon} />
            <Text style={styles.promptText}>{prompt.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};


// Анимированный индикатор набора текста
const TypingIndicator = () => {
  const animations = useRef([...Array(3)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const createAnimation = (anim, delay) => Animated.sequence([
      Animated.timing(anim, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true })
    ]);
    
    const loop = Animated.loop(
      Animated.parallel(animations.map((anim, i) => createAnimation(anim, i * 150)))
    );
    loop.start();
    return () => loop.stop();
  }, [animations]);

  return (
    <View style={styles.aiMessageRow}>
        <View style={styles.avatar}>
          <Ionicons name="sparkles-outline" size={20} color="rgba(255,255,255,0.8)" />
        </View>
        <View style={[styles.messageBubble, styles.aiMessageBubble, { flexDirection: 'row', paddingVertical: 14 }]}>
        {animations.map((anim, index) => (
            <Animated.View key={index} style={[styles.typingDot, {
            transform: [{
                translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })
            }]
            }]} />
        ))}
        </View>
    </View>
  );
};

// Компонент сообщения с новым дизайном
const MessageBubble = ({ message }) => {
  const isUser = message.role === 'user';
  
  const MessageContent = () => (
    <View style={[styles.messageBubble, isUser ? {} : styles.aiMessageBubble ]}>
      <Text style={isUser ? styles.userMessageText : styles.aiMessageText}>
        {message.content}
      </Text>
    </View>
  );

  return (
    <View style={[styles.messageRow, isUser ? styles.userMessageRow : styles.aiMessageRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Ionicons name="sparkles-outline" size={20} color="rgba(255,255,255,0.8)" />
        </View>
      )}
      {isUser ? (
        <LinearGradient colors={['#4a72d8', '#3b92d7']} style={styles.userMessageBubble}>
            <MessageContent />
        </LinearGradient>
      ) : (
        <MessageContent />
      )}
    </View>
  );
};

// Именованный экспорт, как ожидает ваш навигатор
export function ConversationScreen({ route, navigation }) {
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);
  const headerHeight = useHeaderHeight();

  // Ваша логика работы с бэкендом
  useEffect(() => {
    const loadConversation = async () => {
      try {
        const data = await getConversationDetails(conversationId);
        setConversation(data);
        setMessages(data.messages);
        if (data.title) {
          navigation.setOptions({ title: data.title });
        }
      } catch (error) { console.error("Ошибка загрузки диалога:", error); } 
      finally { setLoading(false); }
    };
    loadConversation();
  }, [conversationId, navigation]);

  const handleSend = async () => {
    if (input.trim().length === 0 || sending) return;
    const userMessageContent = input.trim();
    setInput('');
    setSending(true);

    const optimisticUserMessage = { id: Date.now(), role: 'user', content: userMessageContent };
    setMessages(prev => [...prev, optimisticUserMessage]);

    try {
      const response = await sendMessage(conversationId, userMessageContent);
      setMessages(prev => [ ...prev.filter(msg => msg.id !== optimisticUserMessage.id), response.user_message, response.ai_response ]);
      if (!conversation?.title && response?.user_message?.content) {
        navigation.setOptions({ title: response.user_message.content.substring(0, 20) + '...' });
      }
    } catch (error) {
      console.error("Ошибка отправки сообщения:", error);
      setInput(userMessageContent);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticUserMessage.id));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental && UIManager.setLayoutAnimationEnabledExperimental(true);
    }
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [sending, input]);

  // Функция для обработки нажатия на подсказку
  const handlePromptPress = (promptText) => {
    setInput(promptText);
  };

  if (loading) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#172c4d', '#1e3c72']} style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        {/* Если сообщений нет, показываем приветствие, иначе - список */}
        {messages.length === 0 ? (
          <ChatEmptyState onPromptPress={handlePromptPress} />
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={{
              paddingHorizontal: 15,
              paddingBottom: 10,
              paddingTop: 10,
            }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={sending ? <TypingIndicator /> : null}
          />
        )}

        <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your AI teacher..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
          />
          {input.trim().length > 0 && (
            <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
              <Ionicons name="arrow-up-circle" size={36} color="#4a72d8" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

// Стили с добавлением новых для приветственного экрана
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // --- НОВЫЕ СТИЛИ ДЛЯ ПРИВЕТСТВЕННОГО ЭКРАНА ---
    emptyStateContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 50,
    },
    emptyStateAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: 'rgba(74, 114, 216, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    emptyStateTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: '#fff',
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      fontSize: 16,
      color: 'rgba(255, 255, 255, 0.8)',
      textAlign: 'center',
      marginTop: 10,
      lineHeight: 22,
    },
    promptsContainer: {
      marginTop: 40,
      width: '100%',
    },
    promptsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 10,
        textAlign: 'center'
    },
    promptButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 15,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center'
    },
    promptIcon: {
      marginRight: 10,
    },
    promptText: {
      color: 'rgba(255, 255, 255, 0.9)',
      fontSize: 15,
      flex: 1,
    },
    // --- СТИЛИ ДЛЯ СООБЩЕНИЙ ---
    messageRow: {
        flexDirection: 'row',
        marginVertical: 10,
        alignItems: 'flex-end',
    },
    userMessageRow: {
        justifyContent: 'flex-end',
    },
    aiMessageRow: {
        justifyContent: 'flex-start',
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: '85%',
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    userMessageBubble: {
        borderRadius: 20,
        borderBottomRightRadius: 5,
    },
    aiMessageBubble: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        borderBottomLeftRadius: 5,
    },
    aiMessageText: {
        fontSize: 16,
        color: '#fff',
        lineHeight: 22,
    },
    userMessageText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
        lineHeight: 22,
    },
    // --- СТИЛИ ДЛЯ ПОЛЯ ВВОДА ---
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 12,
        paddingTop: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingTop: Platform.OS === 'ios' ? 12 : 10,
        paddingBottom: 12,
        color: '#fff',
        fontSize: 16,
        marginRight: 8,
    },
    sendButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 'auto',
    },
    typingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.6)',
      marginHorizontal: 3,
    }
});