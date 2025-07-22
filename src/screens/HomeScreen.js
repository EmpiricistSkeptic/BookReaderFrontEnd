import React, { useContext, useRef, useEffect, useState } from 'react';
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
  Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// import DocumentPicker from 'react-native-document-picker'; 
import { AuthContext } from '../contexts/AuthContext';
import { apiRequest } from '../services/ApiService';
import FlashCardsScreen from './FlashCardsScreen';
import AIAssistantScreen from './AIAssistantScreen';
import DictionaryScreen from './DictionaryScreen';
import ProfileScreen from './ProfileScreen';

const { width } = Dimensions.get('window');
const Tab = createBottomTabNavigator();

// Заглушки книг для демонстрации
const mockBooks = [
  {
    id: 1,
    title: "Война и мир",
    description: "Роман-эпопея Льва Толстого, описывающий русское общество в эпоху войн против Наполеона",
    cover_url: null,
    book_format: "FB2",
    authors: "Лев Толстой",
    genres: "Классическая литература, Исторический роман",
    language: "ru",
    file_size: 2548736,
    uploaded_at: "2024-01-15T10:30:00Z",
    chapter_count: 365
  },
  {
    id: 2,
    title: "Мастер и Маргарита",
    description: "Роман Михаила Булгакова, сочетающий философскую притчу, сатиру на советскую действительность",
    cover_url: null,
    book_format: "FB2", 
    authors: "Михаил Булгаков",
    genres: "Фантастика, Классическая литература",
    language: "ru",
    file_size: 1876543,
    uploaded_at: "2024-01-20T14:15:00Z",
    chapter_count: 32
  },
  {
    id: 3,
    title: "Преступление и наказание",
    description: "Социально-психологический роман Фёдора Достоевского",
    cover_url: null,
    book_format: "FB2",
    authors: "Фёдор Достоевский",
    genres: "Классическая литература, Психологический роман",
    language: "ru", 
    file_size: 1654321,
    uploaded_at: "2024-01-22T09:45:00Z",
    chapter_count: 39
  },
  {
    id: 4,
    title: "Гарри Поттер и философский камень",
    description: "Первая книга серии о юном волшебнике Гарри Поттере",
    cover_url: null,
    book_format: "FB2",
    authors: "Джоан Роулинг",
    genres: "Фэнтези, Детская литература",
    language: "ru",
    file_size: 987654,
    uploaded_at: "2024-01-25T16:20:00Z",
    chapter_count: 17
  },
  {
    id: 5,
    title: "1984",
    description: "Роман-антиутопия Джорджа Оруэлла о тоталитарном обществе",
    cover_url: null,
    book_format: "FB2",
    authors: "Джорж Оруэлл",
    genres: "Антиутопия, Научная фантастика",
    language: "ru",
    file_size: 876543,
    uploaded_at: "2024-01-28T11:10:00Z",
    chapter_count: 24
  },
  {
    id: 6,
    title: "Анна Каренина",
    description: "Роман Льва Толстого о трагической любви и семейных отношениях",
    cover_url: null,
    book_format: "FB2",
    authors: "Лев Толстой",
    genres: "Классическая литература, Роман",
    language: "ru",
    file_size: 2123456,
    uploaded_at: "2024-02-01T13:30:00Z",
    chapter_count: 239
  }
];

function HomeContent({ navigation }) {
  const { user, signOut } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { 
      toValue: 1, 
      duration: 1200, 
      useNativeDriver: true 
    }).start();
    
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      // Имитируем загрузку данных с сервера
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Используем заглушки вместо реального API вызова
      setBooks(mockBooks);
      
      // Когда будет готов API, раскомментируйте эту строку:
      // const data = await apiRequest('/books/', 'GET');
      // setBooks(data);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить список книг');
    } finally {
      setLoading(false);
    }
  };

  // Временно отключаем нативную загрузку файлов для Expo Go
  const handleUploadBook = () => {
    Alert.alert('Информация', 'Загрузка FB2 через Expo Go временно недоступна.');
  };

  const handleBookPress = (book) => {
    Alert.alert('Информация', `Для чтения книги "${book.title}" нужен отдельный экран BookReader`);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderBookItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.bookItem}
      onPress={() => handleBookPress(item)}
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
        <Text style={styles.bookDate}>
          {formatDate(item.uploaded_at)}
        </Text>
      </View>
      
      <View style={styles.bookActions}>
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading the library...</Text>
        </View>
      );
    }

    if (books.length === 0) {
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
        />
      </View>
    );
  };

  return (
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


      {/* Модальное окно для загрузки */}
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
              Выбор FB2 через Expo Go недоступен
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={handleUploadBook}
              >
                <Ionicons name="document-outline" size={20} color="#2a5298" />
                <Text style={styles.modalButtonText}>Понятно</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Индикатор загрузки */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <View style={styles.uploadingContainer}>
            <ActivityIndicator size="large" color="#2a5298" />
            <Text style={styles.uploadingText}>Загрузка книги...</Text>
          </View>
        </View>
      )}
    </LinearGradient>
  );
}

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
  bookDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
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
    width: width * 0.8,
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
    gap: 15,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
});