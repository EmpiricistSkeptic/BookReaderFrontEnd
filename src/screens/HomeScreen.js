import React, { useContext, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { BlurView } from 'expo-blur';
import { AuthContext } from '../contexts/AuthContext';
import { apiRequest } from '../services/ApiService';

// Заглушки для других экранов
import FlashCardsScreen from './FlashCardsScreen';
import AIAssistantScreen from './AIAssistantScreen';
import DictionaryScreen from './DictionaryScreen';
import ProfileScreen from './ProfileScreen';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

// --- КОМПОНЕНТ ДЛЯ ОТОБРАЖЕНИЯ ИНФОРМАЦИОННЫХ ТЕГОВ ---
const InfoTag = ({ icon, text }) => {
    if (!text || text.trim() === '') return null;
  
    return (
      <View style={styles.tag}>
        <Ionicons name={icon} size={12} color="rgba(255,255,255,0.8)" />
        <Text style={styles.tagText}>{text}</Text>
      </View>
    );
};


// --- КОМПОНЕНТ КНИГИ С ИСПРАВЛЕННЫМИ СТИЛЯМИ ---
const BookItem = ({ item, index, onPress, onDelete }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const rowRef = useRef(null);
  
    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
      ]).start();
    }, [fadeAnim, slideAnim, index]);
  
    const confirmDelete = () => {
        rowRef.current?.close();
        Alert.alert("Подтверждение удаления", `Вы уверены, что хотите удалить книгу "${item.title}"?`, [
            { text: "Отмена", style: "cancel" },
            { text: "Удалить", style: "destructive", onPress: () => onDelete(item.id) }
        ]);
    };

    const renderRightActions = () => (
      <TouchableOpacity onPress={confirmDelete} style={styles.deleteAction}>
        <Ionicons name="trash-outline" size={24} color="#fff" />
      </TouchableOpacity>
    );
    
    const firstGenre = item.genres?.split(',')[0].trim();
    const progressPercentage = item.user_progress?.progress_percentage || 0;

    return (
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Swipeable ref={rowRef} renderRightActions={renderRightActions} overshootRight={false} rightThreshold={60}>
          <TouchableOpacity style={styles.bookItem} onPress={() => onPress(item)} activeOpacity={0.8}>
            <View style={styles.bookCover}>
              {item.cover_url ? (
                <Image source={{ uri: item.cover_url }} style={styles.bookCoverImage} />
              ) : (
                <View style={styles.bookCoverPlaceholder}>
                  <Ionicons name="book" size={30} color="rgba(255,255,255,0.7)" />
                </View>
              )}
            </View>
            
            {/* ИСПРАВЛЕННЫЙ ИНФОРМАЦИОННЫЙ БЛОК */}
            <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>{item.authors || 'Неизвестный автор'}</Text>
              
                <View style={styles.tagsContainer}>
                    <InfoTag icon="cube-outline" text={item.book_format} />
                    <InfoTag icon="globe-outline" text={item.language?.toUpperCase()} />
                    <InfoTag icon="pricetag-outline" text={firstGenre} />
                </View>
              
                {item.user_progress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{`${Math.round(progressPercentage)}%`}</Text>
                  </View>
                )}
            </View>

            <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
};

// --- КОМПОНЕНТ КОНТЕНТА ГЛАВНОГО ЭКРАНА ---
function HomeContent({ navigation }) {
  const { user } = useContext(AuthContext);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/books/', 'GET');
      setBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить список книг');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);
  
  const handleBookPress = (book) => {
    navigation.navigate(book.user_progress ? 'BookReader' : 'BookDetail', {
      bookId: book.id,
      initialChapterOrder: book.user_progress?.last_read_chapter_order,
      initialLastReadPage: book.user_progress?.last_read_page,
    });
  };

  const handleUploadBook = async () => {
    setShowUploadModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['application/epub+zip', 'application/x-fictionbook+xml', 'application/zip'], copyToCacheDirectory: true });
      if (result.canceled || !result.assets) return;

      const file = result.assets[0];
      setUploading(true);
      const formData = new FormData();
      formData.append('file', { uri: file.uri, name: file.name, type: file.mimeType || 'application/octet-stream' });
      const response = await apiRequest('/books/upload/', 'POST', formData);
      Alert.alert('Успех!', response.message || 'Книга успешно загружена');
      await fetchBooks();
    } catch (error) {
      Alert.alert('Ошибка загрузки', error.message || 'Произошла ошибка.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      await apiRequest(`/books/${bookId}/`, 'DELETE');
      setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));
    } catch (error) {
      Alert.alert('Ошибка удаления', error.message || 'Не удалось удалить книгу.');
    }
  };

  const renderListContent = () => {
    if (loading && books.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.centeredText}>Загрузка библиотеки...</Text>
        </View>
      );
    }

    if (!loading && books.length === 0) {
      return (
        <View style={styles.centeredContainer}>
          <Ionicons name="library-outline" size={60} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyTitle}>Ваша библиотека пуста</Text>
          <Text style={styles.emptySubtitle}>Загрузите книгу, чтобы начать читать</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={() => setShowUploadModal(true)}>
            <Ionicons name="add" size={24} color="#2a5298" />
            <Text style={styles.uploadButtonText}>Загрузить книгу</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <FlatList
        data={books}
        renderItem={({ item, index }) => <BookItem item={item} index={index} onPress={handleBookPress} onDelete={handleDeleteBook} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.booksList}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBooks} tintColor="#fff" />}
      />
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
        
        <View style={styles.header}>
            <View style={styles.logoCircle}>
                <Text style={styles.logoIcon}>📚</Text>
            </View>
            <View>
                <Text style={styles.title}>Booklingo</Text>
                <Text style={styles.subtitle}>Привет, {user?.first_name || 'читатель'}!</Text>
            </View>
        </View>
        
        <View style={styles.listContainer}>
            <View style={styles.booksHeader}>
                <Text style={styles.booksTitle}>Мои книги</Text>
                <TouchableOpacity style={styles.addButton} onPress={() => setShowUploadModal(true)}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>
            {renderListContent()}
        </View>

        <Modal visible={showUploadModal} transparent={true} animationType="fade" onRequestClose={() => setShowUploadModal(false)}>
          <BlurView intensity={50} tint="dark" style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Загрузить книгу</Text>
              <Text style={styles.modalSubtitle}>Поддерживаются форматы: FB2, EPUB, ZIP.</Text>
              <TouchableOpacity style={styles.modalButton} onPress={handleUploadBook}>
                <Ionicons name="document-attach-outline" size={20} color="#fff" />
                <Text style={styles.modalButtonText}>Выбрать файл</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowUploadModal(false)}>
                <Text style={styles.modalCancelButtonText}>Отмена</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </Modal>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.uploadingText}>Загрузка книги...</Text>
          </View>
        )}
      </LinearGradient>
    </GestureHandlerRootView>
  );
}


// --- ОСНОВНОЙ КОМПОНЕНТ С НАВИГАЦИЕЙ ---
export default function HomeScreen() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            FlashCards: focused ? 'library' : 'library-outline',
            AIAssistant: focused ? 'sparkles' : 'sparkles-outline',
            Dictionary: focused ? 'book' : 'book-outline',
            Profile: focused ? 'person-circle' : 'person-circle-outline',
          };
          return (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Ionicons name={icons[route.name]} size={focused ? 26 : 24} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.7)',
      })}
    >
      <Tab.Screen name="Home" component={HomeContent} />
      <Tab.Screen name="FlashCards" component={FlashCardsScreen} />
      <Tab.Screen name="AIAssistant" component={AIAssistantScreen} />
      <Tab.Screen name="Dictionary" component={DictionaryScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// --- НОВЫЕ И УЛУЧШЕННЫЕ СТИЛИ ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 25,
    paddingBottom: 20,
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  logoIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  booksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  booksTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  booksList: {
    paddingBottom: 100,
  },
  bookItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center', // Вертикально центрируем обложку и инфо-блок
  },
  bookCover: {
    width: 60,
    height: 90,
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
    justifyContent: 'flex-start', // Выравниваем контент по верху
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  bookAuthor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8, // Отступ от автора
    marginBottom: 8, // Отступ до прогресс-бара
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tagText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '600',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  centeredText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 30,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    elevation: 4,
  },
  uploadButtonText: {
    color: '#2a5298',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    padding: 30,
    width: width * 0.85,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2a5298',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a5298',
    paddingVertical: 15,
    borderRadius: 12,
    justifyContent: 'center',
    width: '100%',
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalCancelButton: {
    paddingVertical: 15,
  },
  modalCancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: 'rgba(30, 60, 114, 0.95)',
    borderTopWidth: 0,
    elevation: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5
  },
  tabIconContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  deleteAction: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 15,
  },
});