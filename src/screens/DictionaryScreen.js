import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
// --- ИЗМЕНЕНИЕ 1: Импортируем FlashList вместо FlatList ---
import { FlashList } from "@shopify/flash-list"; 
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";

import { apiRequest } from '../services/ApiService'; 
import { AuthContext } from '../contexts/AuthContext'; 

const { width } = Dimensions.get("window");
const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
}

export default function DictionaryScreen() {
  const insets = useSafeAreaInsets();
  
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const debouncedQuery = useDebounce(query, 500);

  const [words, setWords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isMoreLoading, setIsMoreLoading] = useState(false);

  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [wordsResponse, categoriesResponse] = await Promise.all([
        apiRequest('/dictionary/?page=1', 'GET'),
        apiRequest('/categories/', 'GET')
      ]);
      setWords(wordsResponse.results || []);
      setHasNextPage(wordsResponse.next !== null);
      setCurrentPage(1);
      setCategories(categoriesResponse || []);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchWords = useCallback(async (page, params) => {
    if (page > 1 && isMoreLoading) return;

    if (page === 1) setIsLoading(true); else setIsMoreLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({ page, ...params }).toString();
      const response = await apiRequest(`/dictionary/?${queryParams}`, 'GET');
      
      setWords(prevWords => {
        const newWords = response.results || [];
        if (page === 1) return newWords;
        const existingIds = new Set(prevWords.map(w => w.id));
        const uniqueNewWords = newWords.filter(w => !existingIds.has(w.id));
        return [...prevWords, ...uniqueNewWords];
      });

      setHasNextPage(response.next !== null);
      setCurrentPage(page);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  }, [isMoreLoading]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (isLoading && words.length === 0) return;

    const params = {};
    if (debouncedQuery) params.search = debouncedQuery;
    if (selectedLevel) params.level = selectedLevel;
    if (selectedCategory) params.categories__slug = selectedCategory;
    
    fetchWords(1, params);
  }, [debouncedQuery, selectedLevel, selectedCategory]);

  const handleLoadMore = () => {
    if (hasNextPage && !isMoreLoading) {
      const params = {};
      if (debouncedQuery) params.search = debouncedQuery;
      if (selectedLevel) params.level = selectedLevel;
      if (selectedCategory) params.categories__slug = selectedCategory;
      fetchWords(currentPage + 1, params);
    }
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedCategory(null);
    setSelectedLevel(null);
  };

  const viewableItems = useRef(new Set());
  const onViewableItemsChanged = useCallback(({ viewableItems: currentViewable }) => {
    currentViewable.forEach(({ item }) => { viewableItems.current.add(item.id); });
  }, []);

  const renderItem = useCallback(
    ({ item }) => (<WordCard item={item} shouldAnimate={!viewableItems.current.has(item.id)} />), 
    []
  );

  const ListFooter = () => {
    if (!isMoreLoading) return null;
    return <View style={styles.footerLoader}><ActivityIndicator size="small" color="#fff" /></View>;
  };

  return (
    <LinearGradient colors={["#1e3c72", "#2a5298"]} style={[styles.container, { paddingBottom: insets.bottom || 16 }]}>
      <View style={styles.header}>
        <LinearGradient colors={["#4e7ac7", "#385a94"]} style={styles.logoCircle}><Text style={styles.logoIcon}>📚</Text></LinearGradient>
        <View style={styles.headerTextBlock}><Text style={styles.title}>Dictionary</Text></View>
        <Text style={styles.subtitle}>Your personal English vocabulary</Text>
        <LinearGradient colors={["#fff", "rgba(255,255,255,0)"]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 0 }} style={styles.subtitleUnderline} />
      </View>
      <View style={styles.listContainer}>
        {/* ... Фильтры и поиск остаются без изменений ... */}
        <View style={styles.controlsRow}>
            <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="rgba(255,255,255,0.8)" />
                <TextInput
                placeholder="Search word or definition"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={query}
                onChangeText={setQuery}
                style={styles.searchInput}
                />
                {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")}>
                    <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity style={styles.mockActionButton} onPress={handleResetFilters}>
                <Ionicons name="refresh" size={20} color="#1e3c72" />
            </TouchableOpacity>
        </View>
        <View style={{ marginTop: 6 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                <Chip label="All" active={!selectedCategory} onPress={() => setSelectedCategory(null)} />
                {categories.map((c) => (
                <Chip key={c.slug} label={c.name} active={selectedCategory === c.slug} onPress={() => setSelectedCategory(selectedCategory === c.slug ? null : c.slug)} />
                ))}
            </ScrollView>
        </View>
        <View style={{ marginTop: 8 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelRow}>
                <LevelButton label="All" active={!selectedLevel} onPress={() => setSelectedLevel(null)} />
                {LEVELS.map((lvl) => (
                <LevelButton key={lvl} label={lvl} active={selectedLevel === lvl} onPress={() => setSelectedLevel(selectedLevel === lvl ? null : lvl)} />
                ))}
            </ScrollView>
        </View>
        <View style={{ flex: 1, marginTop: 12 }}>
          {isLoading && words.length === 0 ? (
            <View style={styles.centeredContainer}><ActivityIndicator size="large" color="#fff" /></View>
          ) : error ? (
            <View style={styles.centeredContainer}>{/* ... Error State ... */}</View>
          ) : (
            // --- ИЗМЕНЕНИЕ 2: Используем FlashList вместо FlatList ---
            <FlashList
              data={words}
              renderItem={renderItem}
              keyExtractor={(item) => item.id.toString()}
              // --- ИЗМЕНЕНИЕ 3: Добавляем estimatedItemSize ---
              // Укажите здесь ПРИМЕРНУЮ среднюю высоту вашей карточки. 
              // 180 - хорошее начальное значение.
              estimatedItemSize={180}
              
              // Все остальные свойства остаются такими же, как у FlatList
              contentContainerStyle={{ paddingBottom: 120 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={() => (
                <View style={styles.centeredContainer}>
                  <Ionicons name="book-outline" size={48} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.emptyTitle}>No words found</Text>
                  <Text style={styles.emptySubtitle}>Try different filters or search</Text>
                </View>
              )}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.8} // Рекомендуется значение повыше для FlashList
              ListFooterComponent={ListFooter}
              onViewableItemsChanged={onViewableItemsChanged}
            />
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

// --- Компонент WordCard и остальные остаются без изменений ---
const WordCard = React.memo(({ item, shouldAnimate }) => {
  const { user } = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(shouldAnimate ? 0 : 1)).current;
  const slideAnim = useRef(new Animated.Value(shouldAnimate ? 18 : 0)).current;

  const [translation, setTranslation] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (shouldAnimate) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 360, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 360, useNativeDriver: true }),
      ]).start();
    }
  }, [fadeAnim, slideAnim, shouldAnimate]);

  const handleTranslate = async () => {
    if (!user) {
      Alert.alert("Authorization Required", "Please log in to use the translation feature.");
      return;
    }
    setIsTranslating(true);
    try {
      const response = await apiRequest(`/dictionary/${item.id}/translate/`, 'POST');
      if (response && response.translation) { setTranslation(response.translation); }
    } catch (error) {
      Alert.alert("Translation Error", error.message || "Could not translate the word.");
    } finally {
      setIsTranslating(false);
    }
  };

  const onCopy = async (text) => {
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", text);
  };
  
  const displayCategory = item.categories && item.categories.length > 0 ? item.categories[0].name : '';

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }, styles.bookItemShadow]}>
      <LinearGradient colors={["rgba(255,255,255,0.12)", "rgba(67,97,158,0.14)"]} style={styles.bookItemBorder}>
        <LinearGradient colors={["#2A2D4A", "#1C2533"]} style={[styles.bookItem, { alignItems: "flex-start", paddingVertical: 14 }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.bookTitle, { fontSize: 18 }]} numberOfLines={1}>{item.word}</Text>
                {item.transcription ? <Text style={styles.bookAuthor}>{item.transcription}</Text> : null}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {item.level && (<View style={styles.tag}><Text style={[styles.tagText, { fontSize: 12 }]}>{item.level}</Text></View>)}
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 8, fontSize: 12 }}>{capitalize(displayCategory)}</Text>
              </View>
            </View>
            <Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 8, lineHeight: 18 }}>{item.definition}</Text>
            <View style={{ marginTop: 12 }}>
              {translation ? (
                <TouchableOpacity style={styles.translationChip} onPress={() => onCopy(translation)}>
                  <Text style={styles.translationLang}>{user?.profile?.native_language?.toUpperCase() || 'RU'}</Text>
                  <Text style={styles.translationText}>{translation}</Text>
                  <Ionicons name="copy-outline" size={14} color="rgba(255,255,255,0.75)" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
              ) : isTranslating ? (
                <View style={styles.translateButton}><ActivityIndicator size="small" color="#fff" /></View>
              ) : (
                <TouchableOpacity style={styles.translateButton} onPress={handleTranslate}>
                  <Ionicons name="language-outline" size={16} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.translateButtonText}>Translate</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </Animated.View>
  );
});

function Chip({ label, onPress, active }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function LevelButton({ label, onPress, active }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.levelButton, active && styles.levelButtonActive]}>
      <Text style={[styles.levelButtonText, active && styles.levelButtonTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function capitalize(s) {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { alignItems: "center", paddingTop: 36, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  logoCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: "center", alignItems: "center", marginBottom: 10, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6 },
  logoIcon: { fontSize: 32 },
  headerTextBlock: { backgroundColor: "rgba(0,0,0,0.12)", paddingHorizontal: 18, paddingVertical: 6, borderRadius: 10, marginBottom: 6 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.85)" },
  subtitleUnderline: { height: 2, width: 40, marginTop: 6, borderRadius: 1, opacity: 0.7 },
  listContainer: { flex: 1, paddingHorizontal: 18, paddingTop: 12 },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  searchBox: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 8 },
  searchInput: { flex: 1, color: "#fff", marginLeft: 8, fontSize: 14 },
  mockActionButton: { marginLeft: 10, width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", opacity: 0.95 },
  chipsRow: { paddingVertical: 8, paddingRight: 8, alignItems: "center", gap: 8 },
  chip: { marginRight: 8, backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" },
  chipActive: { backgroundColor: "rgba(255,255,255,0.14)" },
  chipText: { color: "rgba(255,255,255,0.9)", fontSize: 13, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  levelRow: { paddingVertical: 6, paddingRight: 8 },
  levelButton: { marginRight: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)", backgroundColor: "transparent" },
  levelButtonActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  levelButtonText: { color: "rgba(255,255,255,0.85)", fontWeight: "700" },
  levelButtonTextActive: { color: "#fff" },
  bookItemShadow: { marginBottom: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  bookItemBorder: { borderRadius: 14, padding: 1.5 },
  bookItem: { borderRadius: 12, padding: 14, backgroundColor: "transparent" },
  bookTitle: { fontSize: 16, fontWeight: "700", color: "#fff" },
  bookAuthor: { fontSize: 13, color: "rgba(255,255,255,0.75)" },
  tag: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  tagText: { color: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: "700" },
  centeredContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#fff", marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: "rgba(255,255,255,0.7)", marginTop: 6, textAlign: "center" },
  tryAgainButton: { marginTop: 20, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12 },
  tryAgainButtonText: { color: '#fff', fontWeight: '600' },
  footerLoader: { paddingVertical: 40, alignItems: 'center' },
  translateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignSelf: 'flex-start' },
  translateButtonText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', marginLeft: 8 },
  translationChip: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(142, 213, 250, 0.15)", paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, alignSelf: 'flex-start' },
  translationLang: { color: "#8ED5FC", fontWeight: "700", marginRight: 8 },
  translationText: { color: "rgba(255,255,255,0.95)" },
});