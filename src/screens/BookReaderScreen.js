import React, { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { apiRequest } from '../services/ApiService';
import { AuthContext } from '../contexts/AuthContext';
import { SelectionContext } from '../contexts/SelectionContext';
import TranslationBottomSheet from '../components/TranslationBottomSheet';
import { processTextToStructuredChunks } from '../utils/textProcessor';
import BookPage from '../components/BookPage';
import Paginator from '../components/Paginator';
import AddCardModal from '../components/AddCardModal'; // Импортируем модалку

// --- Константы ---
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TAP_TIME_THRESHOLD = 250;
const TAP_POS_THRESHOLD = 10;
const PROGRESS_SAVE_DEBOUNCE_MS = 1500;
const SETTINGS_SAVE_DEBOUNCE_MS = 1000;

const themes = {
  light: { type: 'color', bg: ['#f5f5f5', '#e8e8e8'], text: '#2c3e50', tint: '#34495e', disabled: '#b0b9c1', ui_bg: 'rgba(255, 255, 255, 0.95)' },
  sepia: { type: 'color', bg: ['#f4ecd8', '#e9dec7'], text: '#5b4636', tint: '#7b6656', disabled: '#ab9a8e', ui_bg: 'rgba(244, 236, 216, 0.95)' },
  dark: { type: 'color', bg: ['#2c3e50', '#212f3c'], text: '#ecf0f1', tint: '#bdc3c7', disabled: '#7f8c8d', ui_bg: 'rgba(44, 62, 80, 0.95)' },
};

const BookReaderScreen = ({ route, navigation }) => {
  const { user } = useContext(AuthContext);
  const { bookId, initialChapterOrder, initialLastReadPage = 1 } = route.params;
  const { setSelectedWord } = useContext(SelectionContext);

  // --- Состояния ---
  const [chapterData, setChapterData] = useState(null);
  const [structuredContent, setStructuredContent] = useState([]);
  const [pages, setPages] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(initialChapterOrder);
  const [loading, setLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(fontSize * 1.6);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationResult, setTranslationResult] = useState(null);
  const [chunkTranslations, setChunkTranslations] = useState({});
  const [translationService, setTranslationService] = useState('microsoft');
  const [speakingIdentifier, setSpeakingIdentifier] = useState(null);

  // --- НОВЫЕ СОСТОЯНИЯ ДЛЯ ИНТЕГРАЦИИ МОДАЛЬНОГО ОКНА ---
  const [isCardModalVisible, setCardModalVisible] = useState(false);
  const [contextSentence, setContextSentence] = useState('');
  // когда true — временно не рендерим bottom sheet чтобы не мешал модалке
  const [suppressBottomSheet, setSuppressBottomSheet] = useState(false);

  // --- Рефы ---
  const flatListRef = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const bottomSheetRef = useRef(null);
  const touchStartTimestamp = useRef(0);
  const touchStartPosition = useRef({ x: 0, y: 0 });
  const isInitialChapterLoad = useRef(true);
  const debounceTimeoutRef = useRef(null);
  const progressToSaveRef = useRef({ order: currentOrder, page: currentPage });
  const settingsDebounceTimeoutRef = useRef(null);

  // реф для контролируемого таймаута открытия модалки (чтобы можно было очистить)
  const openModalTimeoutRef = useRef(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('reading_theme');
        const savedFontSize = await AsyncStorage.getItem('reading_font_size');
        if (savedTheme) setTheme(savedTheme);
        if (savedFontSize) setFontSize(parseInt(savedFontSize, 10));

        const profile = await apiRequest(`/profile/${user.id}/`);
        if (profile.reading_theme && profile.reading_theme !== savedTheme) {
            setTheme(profile.reading_theme);
            await AsyncStorage.setItem('reading_theme', profile.reading_theme);
        }
        if (profile.reading_font_size && profile.reading_font_size !== parseInt(savedFontSize, 10)) {
            setFontSize(profile.reading_font_size);
            await AsyncStorage.setItem('reading_font_size', String(profile.reading_font_size));
        }
      } catch (error) {
        console.error("Failed to load user settings:", error);
      }
    };

    loadSettings();
    fetchChapter(initialChapterOrder);

    return () => {
        Speech.stop();
        if (settingsDebounceTimeoutRef.current) {
            clearTimeout(settingsDebounceTimeoutRef.current);
        }
        if (openModalTimeoutRef.current) {
          clearTimeout(openModalTimeoutRef.current);
          openModalTimeoutRef.current = null;
        }
    }
  }, []);

  useEffect(() => {
    setLineHeight(fontSize * 1.6);
    if (structuredContent.length > 0) setIsPaginating(true);
  }, [fontSize, theme]);

  const fetchChapter = useCallback(async (order) => {
    Speech.stop();
    setSpeakingIdentifier(null);

    setLoading(true);
    isInitialChapterLoad.current = true;
    setStructuredContent([]);
    setPages([]);
    setChunkTranslations({});
    try {
      const data = await apiRequest(`/books/${bookId}/chapter_content/?chapter=${order}`);
      const processedContent = processTextToStructuredChunks(data.chapter.content);
      
      setStructuredContent(processedContent);
      setChapterData(data);
      setCurrentOrder(order);
      setCurrentPage(1); 
      setIsPaginating(true);
    } catch (e) {
      Alert.alert('Error', `Failed to load chapter ${order}.`);
    } finally {
      setLoading(false);
    }
  }, [bookId]);
  
  useEffect(() => {
    Animated.timing(controlsOpacity, { toValue: controlsVisible ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [controlsVisible]);

  const saveProgress = useCallback(async (order, page) => {
    if (!order || !page || page <= 0) return;
    try {
      await apiRequest(`/books/${bookId}/update_progress/`, 'POST', {
        chapter_order: order,
        last_read_page: page,
      });
    } catch (e) {
      console.error(`Failed to save progress: ${e.message}`);
    }
  }, [bookId]);
  
  const saveSettings = useCallback(async (settings) => {
    if (!user) return;
    try {
      await apiRequest(`/profile/${user.id}/`, 'PATCH', settings);
    } catch (error) {
      console.error("Failed to save settings to server:", error);
    }
  }, [user]);

  const handleThemeChange = useCallback(async (newTheme) => {
    setTheme(newTheme);
    await AsyncStorage.setItem('reading_theme', newTheme);
    saveSettings({ reading_theme: newTheme });
  }, [saveSettings]);
  
  const handleFontSizeChange = useCallback((newSize) => {
    const clampedSize = Math.max(12, Math.min(28, newSize));
    setFontSize(clampedSize);
    AsyncStorage.setItem('reading_font_size', String(clampedSize));
    if (settingsDebounceTimeoutRef.current) clearTimeout(settingsDebounceTimeoutRef.current);
    settingsDebounceTimeoutRef.current = setTimeout(() => {
        saveSettings({ reading_font_size: clampedSize });
    }, SETTINGS_SAVE_DEBOUNCE_MS);
  }, [saveSettings]);

  useEffect(() => {
    progressToSaveRef.current = { order: currentOrder, page: currentPage };
    if (isInitialChapterLoad.current) return;
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = setTimeout(() => {
      saveProgress(currentOrder, currentPage);
    }, PROGRESS_SAVE_DEBOUNCE_MS);
  }, [currentPage, currentOrder, saveProgress]);
  
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      saveProgress(progressToSaveRef.current.order, progressToSaveRef.current.page);
    };
  }, [saveProgress]);

  const handlePaginated = useCallback((paginatedPages) => {
    const totalPages = paginatedPages.length;
    setPages(paginatedPages);
    setIsPaginating(false);
    if (totalPages > 0 && chapterData?.chapter?.id && chapterData.chapter.total_pages !== totalPages) {
      apiRequest(`/books/${bookId}/chapters/${chapterData.chapter.id}/update_total_pages/`, 'POST', { total_pages: totalPages })
        .catch(err => console.error("Failed to update total_pages on backend:", err));
    }
    let targetPage = isInitialChapterLoad.current && currentOrder === initialChapterOrder ? initialLastReadPage : 1;
    setTimeout(() => {
      if (flatListRef.current && totalPages > 0) {
        const pageIndex = Math.max(0, Math.min(targetPage - 1, totalPages - 1));
        flatListRef.current.scrollToIndex({ index: pageIndex, animated: false });
        setCurrentPage(targetPage);
        isInitialChapterLoad.current = false;
      }
    }, 50);
  }, [initialLastReadPage, initialChapterOrder, currentOrder, bookId, chapterData]);

  const getItemLayout = (_, index) => ({ length: screenWidth, offset: screenWidth * index, index });

  const handleSpeak = useCallback((text, identifier, languageCode) => {
    Speech.stop();
    
    if (speakingIdentifier === identifier) {
      setSpeakingIdentifier(null);
      return;
    }

    setSpeakingIdentifier(identifier);

    Speech.speak(text, {
      language: languageCode,
      onDone: () => setSpeakingIdentifier(null),
      onStopped: () => setSpeakingIdentifier(null),
      onError: (error) => {
        console.error('Speech synthesis error:', error);
        setSpeakingIdentifier(null);
        Alert.alert('Error', 'The text could not be reproduced.');
      },
    });
  }, [speakingIdentifier]);

  // Функция теперь принимает весь объект chunk, чтобы получить из него контекст
  const handleWordPress = useCallback(async (word, chunk, wordIndexInChunk) => {
    setSelectedWord({ chunkIndex: chunk.originalIndex, wordIndex: wordIndexInChunk });
    const cleanedWord = word.trim().replace(/[.,!?;:"]+$/, '');
    if (cleanedWord.length === 0) {
      setSelectedWord(null);
      return;
    }
    
    // Сохраняем полное предложение как контекст
    setContextSentence(chunk.content); 

    bottomSheetRef.current?.expand();
    setIsTranslating(true);
    setTranslationResult(null);
    try {
      const result = await apiRequest('/translate/', 'POST', { text: cleanedWord, book: bookId, service: translationService });
      setTranslationResult(result);
    } catch (e) {
      setTranslationResult({ error: e.response?.data?.error || 'Failed to complete the translation.' });
    } finally {
      setIsTranslating(false);
    }
  }, [bookId, translationService, setSelectedWord]);
  
  const handleChunkTranslate = useCallback(async (chunk) => {
    const chunkIndex = chunk.originalIndex;
    if (chunkTranslations[chunkIndex]?.text) return;

    setChunkTranslations(prev => ({ ...prev, [chunkIndex]: { isTranslating: true, text: null, error: null }}));

    try {
        const result = await apiRequest('/translate/', 'POST', { text: chunk.content, book: bookId, service: translationService });
        setChunkTranslations(prev => ({ ...prev, [chunkIndex]: { isTranslating: false, text: result.translated_text, error: null }}));
    } catch (e) {
        setChunkTranslations(prev => ({ ...prev, [chunkIndex]: { isTranslating: false, text: null, error: e.response?.data?.error || 'Translation error.' }}));
    }
  }, [bookId, translationService, chunkTranslations]);
  
  const handleSheetChanges = useCallback((index) => {
    if (index === -1) setSelectedWord(null);
  }, [setSelectedWord]);

  const handleTouchStart = (event) => {
    touchStartTimestamp.current = Date.now();
    touchStartPosition.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
  };

  const handleTouchEnd = (event) => {
    const timeDiff = Date.now() - touchStartTimestamp.current;
    const posDiff = Math.hypot(event.nativeEvent.pageX - touchStartPosition.current.x, event.nativeEvent.pageY - touchStartPosition.current.y);
    if (timeDiff < TAP_TIME_THRESHOLD && posDiff < TAP_POS_THRESHOLD) {
      bottomSheetRef.current?.close();
      setControlsVisible(prev => !prev);
    }
  };

  const changeChapter = useCallback(async (newChapterOrder) => {
    if (loading) return;
    await saveProgress(currentOrder, currentPage);
    fetchChapter(newChapterOrder);
  }, [loading, currentOrder, currentPage, fetchChapter, saveProgress]);

  const goToNextChapter = () => !loading && chapterData && currentOrder < chapterData.total_chapters && changeChapter(currentOrder + 1);
  const goToPrevChapter = () => !loading && currentOrder > 1 && changeChapter(currentOrder - 1);

  const handleScroll = useCallback((event) => {
    const newPageNumber = Math.round(event.nativeEvent.contentOffset.x / screenWidth) + 1;
    if (newPageNumber > 0 && newPageNumber !== currentPage) setCurrentPage(newPageNumber);
  }, [currentPage]);
  
  // --- НОВАЯ ФУНКЦИЯ ДЛЯ ОТКРЫТИЯ МОДАЛЬНОГО ОКНА ---
  const handleOpenCardModal = () => {
    if (translationResult && !translationResult.error) {
      // 1) временно скрываем bottom sheet из рендера (чтобы гарантированно не было перекрытия)
      setSuppressBottomSheet(true);

      // 2) просим bottom sheet закрыться (если он открыт)
      bottomSheetRef.current?.close();

      // 3) очищаем старый таймаут (если есть) и ставим новый для открытия модалки
      if (openModalTimeoutRef.current) {
        clearTimeout(openModalTimeoutRef.current);
        openModalTimeoutRef.current = null;
      }

      // 350ms — обычно достаточно, если анимация bottom-sheet 200-300ms; на медленных устройствах можно увеличить
      openModalTimeoutRef.current = setTimeout(() => {
        setCardModalVisible(true);
        openModalTimeoutRef.current = null;
      }, 350);
    } else {
      Alert.alert("Error", "No data to create a card.");
    }
  };

  // при закрытии модалки — возвращаем bottom sheet в рендер
  const handleCloseCardModal = () => {
    // если был запущен таймаут на открытие — отменяем
    if (openModalTimeoutRef.current) {
      clearTimeout(openModalTimeoutRef.current);
      openModalTimeoutRef.current = null;
    }
    setCardModalVisible(false);
    // даём небольшую задержку, чтобы не дергать bottom sheet сразу во время закрытия модалки
    setTimeout(() => setSuppressBottomSheet(false), 80);
  };

  const currentTheme = themes[theme];
  const totalChapters = chapterData?.total_chapters || 0;
  const progressPercent = pages.length > 0 ? (currentPage / pages.length) * 100 : 0;
  
  const pageStyle = useMemo(() => ({
    width: screenWidth - 40,
    height: screenHeight - 85 - 120,
    fontSize,
    lineHeight,
  }), [fontSize, lineHeight]);

  const renderPage = useCallback(({ item }) => (
    <View style={{ width: screenWidth }}>
      <BookPage
        pageContent={item}
        onWordPress={handleWordPress}
        theme={currentTheme}
        fontSize={fontSize}
        lineHeight={lineHeight}
        onChunkTranslate={handleChunkTranslate}
        chunkTranslations={chunkTranslations}
        onSpeak={handleSpeak}
        speakingIdentifier={speakingIdentifier}
        bookLanguage={chapterData?.chapter?.book_language || 'en-US'}
      />
    </View>
  ), [handleWordPress, currentTheme, fontSize, lineHeight, handleChunkTranslate, chunkTranslations, handleSpeak, speakingIdentifier, chapterData]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient colors={currentTheme.bg} style={styles.container}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        
        {isPaginating && <Paginator structuredContent={structuredContent} pageStyle={pageStyle} onPaginated={handlePaginated} />}
        
        <View style={styles.contentArea} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} activeOpacity={1}>
          {loading ? (
             <ActivityIndicator size="large" color={currentTheme.tint} />
          ) : isPaginating ? (
            <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color={currentTheme.tint} />
                <Text style={[styles.statusText, {color: currentTheme.tint}]}>Formatting page...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={pages}
              renderItem={renderPage}
              keyExtractor={(_, index) => `page-${index}`}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              getItemLayout={getItemLayout}
              removeClippedSubviews={true}
              windowSize={5}
              initialNumToRender={1}
              maxToRenderPerBatch={3}
              extraData={{ theme, fontSize, pages: pages.length, chunkTranslations, speakingIdentifier }} 
            />
          )}
        </View>

        <Animated.View style={[styles.header, { backgroundColor: currentTheme.ui_bg, opacity: controlsOpacity, pointerEvents: controlsVisible ? 'auto' : 'none' }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={currentTheme.tint} /></TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, {color: currentTheme.tint}]} numberOfLines={1}>{chapterData?.chapter.title || 'Loading...'}</Text>
              <Text style={[styles.progressText, {color: currentTheme.tint}]}>Chapter {currentOrder} of {totalChapters || '...'}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="bookmark-outline" size={22} color={currentTheme.tint} /></TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.footer, { backgroundColor: currentTheme.ui_bg, opacity: controlsOpacity, pointerEvents: controlsVisible ? 'auto' : 'none' }]}>
          <View style={styles.footerContent}>
            <View style={styles.progressFooterContainer}>
              <Text style={[styles.progressFooterText, {color: currentTheme.tint}]}>Page. {currentPage} of {pages.length}</Text>
              <View style={styles.progressFooterBar}><View style={[styles.progressFooterFill, { width: `${progressPercent}%`, backgroundColor: currentTheme.tint }]} /></View>
            </View>
            <View style={styles.serviceSelectorContainer}>
                <TouchableOpacity style={[styles.serviceButton, translationService === 'deepl' && styles.serviceButtonActive]} onPress={() => setTranslationService('deepl')}><Text style={[styles.serviceButtonText, {color: currentTheme.tint}]}>DeepL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.serviceButton, translationService === 'microsoft' && styles.serviceButtonActive]} onPress={() => setTranslationService('microsoft')}><Text style={[styles.serviceButtonText, {color: currentTheme.tint}]}>Microsoft</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.serviceButton, translationService === 'chatgpt' && styles.serviceButtonActive]} onPress={() => setTranslationService('chatgpt')}><Text style={[styles.serviceButtonText, {color: currentTheme.tint}]}>GPT-4o</Text></TouchableOpacity>
            </View>
            <View style={styles.settings}>
              <TouchableOpacity onPress={() => handleFontSizeChange(fontSize - 1)} style={styles.iconButton}><Text style={[styles.fontSetting, {color: currentTheme.tint}]}>A-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => handleThemeChange('light')} style={[styles.themeButton, theme === 'light' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#f5f5f5'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleThemeChange('sepia')} style={[styles.themeButton, theme === 'sepia' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#f4ecd8'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleThemeChange('dark')} style={[styles.themeButton, theme === 'dark' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#2c3e50'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => handleFontSizeChange(fontSize + 1)} style={styles.iconButton}><Text style={[styles.fontSetting, {color: currentTheme.tint}]}>A+</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={goToPrevChapter} disabled={loading || currentOrder <= 1} style={styles.navButtonLeft}><Ionicons name="chevron-back" size={24} color={currentOrder > 1 ? currentTheme.tint : currentTheme.disabled} /><Text style={[styles.navText, { color: currentOrder > 1 ? currentTheme.tint : currentTheme.disabled }]}>Prev</Text></TouchableOpacity>
          <TouchableOpacity onPress={goToNextChapter} disabled={loading || !chapterData || currentOrder >= totalChapters} style={styles.navButtonRight}><Text style={[styles.navText, { color: !chapterData || currentOrder < totalChapters ? currentTheme.tint : currentTheme.disabled }]}>Next</Text><Ionicons name="chevron-forward" size={24} color={!chapterData || currentOrder < totalChapters ? currentTheme.tint : currentTheme.disabled} /></TouchableOpacity>
        </Animated.View>
      </LinearGradient>

      {/* --- ИНТЕРАКТИВНЫЕ КОМПОНЕНТЫ, ВЫНЕСЕННЫЕ ЗА ПРЕДЕЛЫ ГРАДИЕНТА --- */}
      {/* Если suppressBottomSheet === true — временно не рендерим bottom sheet, чтобы он не перекрывал модалку */}
      {!suppressBottomSheet && (
        <TranslationBottomSheet 
          bottomSheetRef={bottomSheetRef} 
          isTranslating={isTranslating} 
          translationResult={translationResult} 
          theme={currentTheme} 
          onChange={handleSheetChanges}
          onSpeak={handleSpeak}
          bookLanguage={chapterData?.chapter?.book_language || 'en-US'}
          // Передаем нашу новую функцию в компонент
          onAddToFlashcards={handleOpenCardModal}
        />
      )}

      <AddCardModal
        visible={isCardModalVisible}
        onClose={handleCloseCardModal}
        onCardAdded={() => {
          Alert.alert("Success", "The card has been added to your deck!");
          handleCloseCardModal();
        }}
        // Передаем начальные данные в модалку
        initialWord={translationResult?.original_text || translationResult?.source_text || translationResult?.text || ''}
        initialTranslation={translationResult?.translated_text || translationResult?.translation || ''}
        initialExample={contextSentence} // Передаем полное предложение как пример
      />
    </GestureHandlerRootView>
  );
};

// --- СТИЛИ ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusText: { marginTop: 15, fontSize: 16 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, height: 85, paddingTop: 35, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, zIndex: 10, borderBottomLeftRadius: 15, borderBottomRightRadius: 15 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, paddingBottom: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, zIndex: 10, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  headerInfo: { alignItems: 'center', flex: 1, marginHorizontal: 10 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  progressText: { fontSize: 12 },
  iconButton: { padding: 10 },
  footerContent: { flex: 1, justifyContent: 'space-between', paddingBottom: 5, paddingTop: 5, },
  progressFooterContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20 },
  progressFooterText: { fontSize: 12, minWidth: 80, textAlign: 'center' },
  progressFooterBar: { flex: 1, height: 3, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 1.5 },
  progressFooterFill: { height: '100%', borderRadius: 1.5 },
  serviceSelectorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 25 }, 
  serviceButton: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1.5, borderColor: 'transparent' },
  serviceButtonActive: { borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)' },
  serviceButtonText: { fontSize: 12, fontWeight: '500' },
  settings: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  fontSetting: { fontSize: 18, fontWeight: 'bold' },
  themeButton: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  themeButtonActive: { borderColor: '#3498db' },
  themeCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  navButtonLeft: { position: 'absolute', left: 10, bottom: 45, flexDirection: 'row', alignItems: 'center' },
  navButtonRight: { position: 'absolute', right: 10, bottom: 45, flexDirection: 'row', alignItems: 'center' },
  navText: { fontSize: 16 },
});

export default BookReaderScreen;