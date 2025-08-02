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
// Импортируем компоненты для обработки жестов
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { AuthContext } from '../contexts/AuthContext';
import { apiRequest } from '../services/ApiService';

// Заглушки для других экранов, чтобы навигация работала
import FlashCardsScreen from './FlashCardsScreen';
import AIAssistantScreen from './AIAssistantScreen';
import DictionaryScreen from './DictionaryScreen';
import ProfileScreen from './ProfileScreen';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

// --- КОМПОНЕНТ КОНТЕНТА ГЛАВНОГО ЭКРАНА ---
function HomeContent({ navigation }) {
  const { user } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Рефы для управления открытыми свайпами
  const rowRefs = useRef({});
  const [openedRowId, setOpenedRowId] = useState(null);

  const fetchBooks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/books/', 'GET');
      setBooks(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить список книг');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true
    }).start();
    fetchBooks();
  }, [fetchBooks]);

  const handleUploadBook = async () => {
    setShowUploadModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const file = result.assets[0];
      if (!file || !file.name) {
        Alert.alert("Ошибка", "Не удалось получить имя выбранного файла.");
        return;
      }

      const fileNameLower = file.name.toLowerCase();
      if (!(fileNameLower.endsWith('.fb2') || fileNameLower.endsWith('.zip'))) {
        Alert.alert(
          'Неверный формат',
          'Пожалуйста, выберите книгу в формате .fb2 или .zip'
        );
        return;
      }

      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });
      const response = await apiRequest('/books/upload_fb2/', 'POST', formData);
      Alert.alert('Успех!', response.message || 'Книга успешно загружена');
      await fetchBooks();
    } catch (error) {
      const errorMessage = (error instanceof Error ? error.message : String(error));
      Alert.alert(
        'Ошибка загрузки',
        errorMessage || 'Произошла неизвестная ошибка при загрузке файла.'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleBookPress = (book) => {
    navigation.navigate('BookDetail', { bookId: book.id });
  };

  // --- ЛОГИКА УДАЛЕНИЯ КНИГИ ---
  const handleDeleteBook = async (bookId) => {
    // Закрываем свайп перед показом диалога
    rowRefs.current[bookId]?.close();

    Alert.alert(
      "Подтверждение удаления",
      "Вы уверены, что хотите удалить эту книгу? Это действие необратимо.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              // Отправляем DELETE запрос на сервер, как этого требует perform_delete во вьюсете
              await apiRequest(`/books/${bookId}/`, 'DELETE');

              // Оптимистичное обновление UI: удаляем книгу из списка сразу
              setBooks(prevBooks => prevBooks.filter(book => book.id !== bookId));

            } catch (error) {
              Alert.alert('Ошибка удаления', error.message || 'Не удалось удалить книгу.');
            }
          }
        }
      ]
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // --- ФУНКЦИЯ ДЛЯ РЕНДЕРИНГА КРАСНОЙ КОРЗИНКИ ---
  const renderRightActions = (progress, dragX, item) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity onPress={() => handleDeleteBook(item.id)} style={styles.deleteAction}>
        <Animated.View style={[styles.deleteButton, { transform: [{ translateX: trans }] }]}>
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // --- КОМПОНЕНТ КАРТОЧКИ КНИГИ, ОБЕРНУТЫЙ В SWIPEABLE ---
  const renderBookItem = ({ item }) => (
    <Swipeable
      ref={ref => (rowRefs.current[item.id] = ref)}
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      onSwipeableWillOpen={() => {
        // Закрываем предыдущий открытый свайп для удобства
        if (openedRowId && openedRowId !== item.id) {
          rowRefs.current[openedRowId]?.close();
        }
        setOpenedRowId(item.id);
      }}
      overshootRight={false}
      rightThreshold={40}
    >
      <TouchableOpacity
        style={styles.bookItem}
        onPress={() => handleBookPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.bookCover}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.bookCoverImage} />
          ) : (
            <View style={styles.bookCoverPlaceholder}>
              <Ionicons name="book" size={30} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>

        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.bookAuthor} numberOfLines={1}>
            {item.authors || 'Неизвестный автор'}
          </Text>
          <View style={styles.bookMeta}>
            <Text style={styles.bookMetaText}>
              {item.chapter_count} глав
            </Text>
            <Text style={styles.bookMetaText}>
              {formatFileSize(item.file_size)}
            </Text>
          </View>

          {item.user_progress && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: `${item.user_progress.progress_percentage}%` }
                ]} />
              </View>
              <Text style={styles.progressText}>
                {item.user_progress.progress_percentage.toFixed(0)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bookActions}>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderContent = () => {
    if (loading && books.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading the library...</Text>
        </View>
      );
    }

    if (!loading && books.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="library-outline" size={60} color="rgba(255,255,255,0.5)" />
          <Text style={styles.emptyTitle}>Your library is empty</Text>
          <Text style={styles.emptySubtitle}>
            Upload your first book to start reading
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="add" size={24} color="#2a5298" />
            <Text style={styles.uploadButtonText}>Загрузить книгу</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.booksContainer}>
        <View style={styles.booksHeader}>
          <Text style={styles.booksTitle}>My Books</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowUploadModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={books}
          renderItem={renderBookItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.booksList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={fetchBooks}
              tintColor="#fff"
            />
          }
        />
      </View>
    );
  };

  return (
    // Оборачиваем весь экран в GestureHandlerRootView для корректной работы жестов
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>📚</Text>
          </View>
          <Text style={styles.title}>Booklingo</Text>
          <Text style={styles.subtitle}>
            Hello, {user?.first_name || user?.username || 'пользователь'}!
          </Text>
        </Animated.View>

        {renderContent()}

        <Modal
          visible={showUploadModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowUploadModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Загрузить книгу</Text>
              <Text style={styles.modalSubtitle}>
                Выберите книгу в формате FB2 для добавления в библиотеку.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={handleUploadBook}
                >
                  <Ionicons name="document-attach-outline" size={20} color="#2a5298" />
                  <Text style={styles.modalButtonText}>Выбрать FB2 файл</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowUploadModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Отмена</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {uploading && (
          <View style={styles.uploadingOverlay}>
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="large" color="#2a5298" />
              <Text style={styles.uploadingText}>Загрузка книги...</Text>
            </View>
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
        tabBarItemStyle: styles.tabItem,
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          let iconSize = focused ? 28 : 24;

          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'FlashCards') iconName = focused ? 'library' : 'library-outline';
          else if (route.name === 'AIAssistant') iconName = focused ? 'bulb' : 'bulb-outline';
          else if (route.name === 'Dictionary') iconName = focused ? 'book' : 'book-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person-circle' : 'person-circle-outline';

          return (
            <View style={[styles.tabIconContainer, focused && styles.tabIconContainerActive]}>
              <Ionicons name={iconName} size={iconSize} color={color} />
            </View>
          );
        },
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

// --- СТИЛИ ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  logoCircle: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: (width * 0.2) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoIcon: {
    fontSize: 36,
  },
  title: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  booksContainer: {
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
    fontSize: 20,
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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    alignItems: 'center',
  },
  bookCover: {
    width: 60,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
    overflow: 'hidden',
  },
  bookCoverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bookCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  bookAuthor: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  bookMeta: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  bookMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  bookActions: {
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
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
  },
  modalButtons: {
    width: '100%',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: 'center',
  },
  modalButtonText: {
    color: '#2a5298',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  modalCancelButton: {
    paddingVertical: 15,
    alignItems: 'center',
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
  uploadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  uploadingText: {
    color: '#2a5298',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
  },
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(30, 60, 114, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
    borderTopWidth: 0,
    paddingBottom: 0,
  },
  tabItem: {
    flex: 1,
    margin: 8,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabIconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  // --- СТИЛИ ДЛЯ КНОПКИ УДАЛЕНИЯ ---
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end', // Выравниваем по правому краю
    width: 80,
    marginBottom: 12, // Синхронизируем с отступом карточки
  },
  deleteButton: {
    backgroundColor: '#e74c3c', // Красный цвет
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    borderRadius: 12,
  }
});