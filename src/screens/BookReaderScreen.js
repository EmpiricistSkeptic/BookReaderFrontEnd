// file: src/screens/BookReaderScreen.js

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
import { apiRequest } from '../services/ApiService';
import TranslationBottomSheet from '../components/TranslationBottomSheet';
import { processTextToStructuredChunks } from '../utils/textProcessor';
import { SelectionContext } from '../contexts/SelectionContext';
import BookPage from '../components/BookPage';
import Paginator from '../components/Paginator';

// --- Константы ---
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const TAP_TIME_THRESHOLD = 250;
const TAP_POS_THRESHOLD = 10;
const themes = {
  light: { type: 'color', bg: ['#f5f5f5', '#e8e8e8'], text: '#2c3e50', tint: '#34495e', disabled: '#b0b9c1', ui_bg: 'rgba(255, 255, 255, 0.95)' },
  sepia: { type: 'color', bg: ['#f4ecd8', '#e9dec7'], text: '#5b4636', tint: '#7b6656', disabled: '#ab9a8e', ui_bg: 'rgba(244, 236, 216, 0.95)' },
  dark: { type: 'color', bg: ['#2c3e50', '#212f3c'], text: '#ecf0f1', tint: '#bdc3c7', disabled: '#7f8c8d', ui_bg: 'rgba(44, 62, 80, 0.95)' },
};

const BookReaderScreen = ({ route, navigation }) => {
  const { bookId, initialChapterOrder } = route.params;
  const { setSelectedWord } = useContext(SelectionContext);

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
  const [translationService, setTranslationService] = useState('deepl');

  const flatListRef = useRef(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const bottomSheetRef = useRef(null);
  const touchStartTimestamp = useRef(0);
  const touchStartPosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setLineHeight(fontSize * 1.6);
    if (structuredContent.length > 0) {
      setIsPaginating(true);
    }
  }, [fontSize, theme]);

  const fetchChapter = useCallback(async (order) => {
    setLoading(true);
    setStructuredContent([]);
    setPages([]);
    try {
      const data = await apiRequest(`/books/${bookId}/chapter_content/?chapter=${order}`);
      const processedContent = processTextToStructuredChunks(data.chapter.content);
      
      setStructuredContent(processedContent.map((item, index) => ({ ...item, originalIndex: index })));
      setChapterData(data);
      setCurrentOrder(order);
      setCurrentPage(1);
      
      setIsPaginating(true);
      
      apiRequest(`/books/${bookId}/update_progress/`, 'POST', { chapter_order: order }).catch(console.error);
    } catch (e) {
      Alert.alert('Ошибка', `Не удалось загрузить главу ${order}.`);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchChapter(initialChapterOrder);
  }, [initialChapterOrder, fetchChapter]);

  useEffect(() => {
    Animated.timing(controlsOpacity, { toValue: controlsVisible ? 1 : 0, duration: 300, useNativeDriver: true }).start();
  }, [controlsVisible]);

  const handlePaginated = useCallback((paginatedPages) => {
    setPages(paginatedPages);
    setIsPaginating(false);
  }, []);

  const handleWordPress = useCallback(async (word, chunkIndex, wordIndex) => {
    setSelectedWord({ chunkIndex, wordIndex });
    const cleanedWord = word.trim().replace(/[.,!?;:"]+$/, '');
    if (cleanedWord.length === 0) {
      setSelectedWord(null);
      return;
    }
    bottomSheetRef.current?.expand();
    setIsTranslating(true);
    setTranslationResult(null);
    try {
      const result = await apiRequest('/translate/', 'POST', { text: cleanedWord, book: bookId, service: translationService });
      setTranslationResult(result);
    } catch (e) {
      setTranslationResult({ error: e.response?.data?.error || e.message || 'Не удалось выполнить перевод.' });
    } finally {
      setIsTranslating(false);
    }
  }, [bookId, translationService, setSelectedWord]);
  
  const handleSheetChanges = useCallback((index) => {
    if (index === -1) setSelectedWord(null);
  }, [setSelectedWord]);

  const handleTouchStart = (event) => {
    touchStartTimestamp.current = Date.now();
    touchStartPosition.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
  };

  const handleTouchEnd = (event) => {
    const timeDiff = Date.now() - touchStartTimestamp.current;
    const posDiff = Math.sqrt(Math.pow(event.nativeEvent.pageX - touchStartPosition.current.x, 2) + Math.pow(event.nativeEvent.pageY - touchStartPosition.current.y, 2));
    if (timeDiff < TAP_TIME_THRESHOLD && posDiff < TAP_POS_THRESHOLD) {
      bottomSheetRef.current?.close();
      setControlsVisible(prev => !prev);
    }
  };

  const goToNextChapter = () => (chapterData && currentOrder < chapterData.total_chapters) && fetchChapter(currentOrder + 1);
  const goToPrevChapter = () => (currentOrder > 1) && fetchChapter(currentOrder - 1);

  const handleScroll = useCallback((event) => {
    const newPageNumber = Math.round(event.nativeEvent.contentOffset.x / screenWidth) + 1;
    if (newPageNumber !== currentPage) {
      setCurrentPage(newPageNumber);
    }
  }, [currentPage]);
  
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
      />
    </View>
  ), [handleWordPress, currentTheme, fontSize, lineHeight]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <LinearGradient colors={currentTheme.bg} style={styles.container}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
        
        {isPaginating && (
            <Paginator
                structuredContent={structuredContent}
                pageStyle={pageStyle}
                onPaginated={handlePaginated}
            />
        )}
        
        <View style={styles.contentArea} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} activeOpacity={1}>
          {loading ? (
             <ActivityIndicator size="large" color={currentTheme.tint} />
          ) : isPaginating ? (
            <View style={styles.statusContainer}>
                <ActivityIndicator size="large" color={currentTheme.tint} />
                <Text style={[styles.statusText, {color: currentTheme.tint}]}>Форматирование страницы...</Text>
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
              removeClippedSubviews={true}
              windowSize={3}
              initialNumToRender={1}
              maxToRenderPerBatch={1}
            />
          )}
        </View>

        <Animated.View style={[styles.header, { backgroundColor: currentTheme.ui_bg, opacity: controlsOpacity, pointerEvents: controlsVisible ? 'auto' : 'none' }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}><Ionicons name="arrow-back" size={24} color={currentTheme.tint} /></TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, {color: currentTheme.tint}]} numberOfLines={1}>{chapterData?.chapter.title || 'Загрузка...'}</Text>
              <Text style={[styles.progressText, {color: currentTheme.tint}]}>Глава {currentOrder} из {totalChapters || '...'}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton}><Ionicons name="bookmark-outline" size={22} color={currentTheme.tint} /></TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.footer, { backgroundColor: currentTheme.ui_bg, opacity: controlsOpacity, pointerEvents: controlsVisible ? 'auto' : 'none' }]}>
          <View style={styles.footerContent}>
            <View style={styles.progressFooterContainer}>
              <Text style={[styles.progressFooterText, {color: currentTheme.tint}]}>Стр. {currentPage} из {pages.length}</Text>
              <View style={styles.progressFooterBar}><View style={[styles.progressFooterFill, { width: `${progressPercent}%`, backgroundColor: currentTheme.tint }]} /></View>
            </View>
            <View style={styles.serviceSelectorContainer}>
                <TouchableOpacity style={[styles.serviceButton, translationService === 'deepl' && styles.serviceButtonActive]} onPress={() => setTranslationService('deepl')}><Text style={[styles.serviceButtonText, {color: currentTheme.tint}]}>DeepL</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.serviceButton, translationService === 'chatgpt' && styles.serviceButtonActive]} onPress={() => setTranslationService('chatgpt')}><Text style={[styles.serviceButtonText, {color: currentTheme.tint}]}>GPT-4o</Text></TouchableOpacity>
            </View>
            <View style={styles.settings}>
              <TouchableOpacity onPress={() => setFontSize(s => Math.max(12, s - 1))} style={styles.iconButton}><Text style={[styles.fontSetting, {color: currentTheme.tint}]}>A-</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => setTheme('light')} style={[styles.themeButton, theme === 'light' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#f5f5f5'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setTheme('sepia')} style={[styles.themeButton, theme === 'sepia' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#f4ecd8'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setTheme('dark')} style={[styles.themeButton, theme === 'dark' && styles.themeButtonActive]}><View style={[styles.themeCircle, {backgroundColor: '#2c3e50'}]} /></TouchableOpacity>
              <TouchableOpacity onPress={() => setFontSize(s => Math.min(28, s + 1))} style={styles.iconButton}><Text style={[styles.fontSetting, {color: currentTheme.tint}]}>A+</Text></TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity onPress={goToPrevChapter} disabled={currentOrder <= 1} style={styles.navButtonLeft}><Ionicons name="chevron-back" size={24} color={currentOrder > 1 ? currentTheme.tint : currentTheme.disabled} /><Text style={[styles.navText, { color: currentOrder > 1 ? currentTheme.tint : currentTheme.disabled }]}>Prev</Text></TouchableOpacity>
          <TouchableOpacity onPress={goToNextChapter} disabled={!chapterData || currentOrder >= totalChapters} style={styles.navButtonRight}><Text style={[styles.navText, { color: !chapterData || currentOrder < totalChapters ? currentTheme.tint : currentTheme.disabled }]}>Next</Text><Ionicons name="chevron-forward" size={24} color={!chapterData || currentOrder < totalChapters ? currentTheme.tint : currentTheme.disabled} /></TouchableOpacity>
        </Animated.View>
      </LinearGradient>
      <TranslationBottomSheet bottomSheetRef={bottomSheetRef} isTranslating={isTranslating} translationResult={translationResult} theme={currentTheme} onChange={handleSheetChanges} />
    </GestureHandlerRootView>
  );
};

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
  serviceSelectorContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, height: 25 },
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