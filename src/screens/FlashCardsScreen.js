import React, { useState, useRef, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
// <-- ИЗМЕНЕНИЕ 1: Импортируем хуки для навигации
import { useFocusEffect, useNavigation } from '@react-navigation/native'; 
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/ApiService';

const { width, height } = Dimensions.get('window');

// --- УМНОЕ МОДАЛЬНОЕ ОКНО ДЛЯ СОЗДАНИЯ КАРТОЧКИ --- (без изменений)
const AddCardModal = ({ visible, onClose, onCardAdded }) => {
    // ... ваш код модального окна без изменений ...
    const [word, setWord] = useState('');
    const [translation, setTranslation] = useState('');
    const [example, setExample] = useState('');
    const [suggestedExamples, setSuggestedExamples] = useState([]);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimeout = useRef(null);
    useEffect(() => {
        if (debounceTimeout.current) {
            clearTimeout(debounceTimeout.current);
        }
        if (word.trim().length > 1) {
            debounceTimeout.current = setTimeout(async () => {
                setIsSuggesting(true);
                setSuggestedExamples([]);
                try {
                    const suggestions = await apiRequest('/flashcards/get-suggestions/', 'POST', { word: word.trim() });
                    if (suggestions) {
                        setTranslation(suggestions.translation || '');
                        setSuggestedExamples(suggestions.examples || []);
                    }
                } catch (error) {
                    console.error("Suggestion fetch error:", error);
                } finally {
                    setIsSuggesting(false);
                }
            }, 750);
        } else {
            setSuggestedExamples([]);
        }
        return () => {
            if (debounceTimeout.current) {
                clearTimeout(debounceTimeout.current);
            }
        };
    }, [word]);
    const handleSave = async () => {
        if (!word.trim() || !translation.trim()) {
            Alert.alert('Ошибка', 'Поля "Слово" и "Перевод" обязательны.');
            return;
        }
        setIsSaving(true);
        try {
            await apiRequest('/flashcards/', 'POST', { word: word.trim(), translation: translation.trim(), example: example.trim() });
            Alert.alert('Успех!', 'Карточка успешно добавлена.');
            handleClose();
            onCardAdded();
        } catch (error) {
            Alert.alert('Ошибка', error.message || 'Не удалось сохранить карточку.');
        } finally {
            setIsSaving(false);
        }
    };
    const handleClose = () => {
        setWord(''); setTranslation(''); setExample(''); setSuggestedExamples([]);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        onClose();
    }
    return (
        <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={handleClose}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Новая карточка</Text>
                        <TouchableOpacity onPress={handleClose}><Ionicons name="close-circle" size={30} color="#ccc" /></TouchableOpacity>
                    </View>
                    <ScrollView>
                        <Text style={styles.inputLabel}>Слово или фраза</Text>
                        <TextInput style={styles.textInput} placeholder="Начните вводить слово..." placeholderTextColor="#999" value={word} onChangeText={setWord} />
                        <Text style={styles.inputLabel}>Перевод</Text>
                        <View style={styles.inputContainer}>
                            <TextInput style={[styles.textInput, {flex: 1}]} placeholder="Перевод появится здесь" placeholderTextColor="#999" value={translation} onChangeText={setTranslation} />
                            {isSuggesting && <ActivityIndicator style={{marginLeft: 10}} color="#2a5298"/>}
                        </View>
                        <Text style={styles.inputLabel}>Пример использования</Text>
                        <TextInput style={[styles.textInput, {height: 80, textAlignVertical: 'top'}]} placeholder="Выберите пример или введите свой" placeholderTextColor="#999" value={example} onChangeText={setExample} multiline/>
                        {isSuggesting && suggestedExamples.length === 0 && <ActivityIndicator style={{marginVertical: 10}} color="#2a5298"/>}
                        {suggestedExamples.length > 0 && (
                            <View>
                                {suggestedExamples.map((ex, index) => (
                                    <TouchableOpacity key={index} style={styles.suggestionChip} onPress={() => setExample(ex)}>
                                        <Text style={styles.suggestionText}>{ex}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </ScrollView>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving || isSuggesting}>
                        {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Сохранить карточку</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};


// --- КОМПОНЕНТЫ ДИЗАЙНА --- (без изменений)
const StatChip = ({ value, label, icon }) => (
    <View style={styles.statChip}>
        <Ionicons name={icon} size={22} color="rgba(255,255,255,0.8)" style={{marginRight: 10}}/>
        <View>
            <Text style={styles.statChipValue}>{value}</Text>
            <Text style={styles.statChipLabel}>{label}</Text>
        </View>
    </View>
);
const CardStack = ({ onPress, cardsDue }) => {
    // ... ваш код CardStack без изменений ...
    const pressAnim = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(pressAnim, { toValue: 0.95, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start();
    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
            <Animated.View style={[styles.cardStack, { transform: [{scale: pressAnim}] }]}>
                <View style={[styles.cardStackItem, styles.cardStackItem3]} />
                <View style={[styles.cardStackItem, styles.cardStackItem2]} />
                <View style={[styles.cardStackItem, styles.cardStackItem1]}>
                    <Ionicons name="play-circle-outline" size={60} color="#1e3c72" />
                    <Text style={styles.cardStackTitle}>Начать сессию</Text>
                    <Text style={styles.cardStackSubtitle}>{cardsDue} карточек на сегодня</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// --- ОСНОВНОЙ КОМПОНЕНТ ЭКРАНА ---
export default function FlashCardsScreen() {
    // <-- ИЗМЕНЕНИЕ 2: Получаем объект навигации с помощью хука
    const navigation = useNavigation(); 

    const [sessionState, setSessionState] = useState('stats');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [cards, setCards] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalVisible, setModalVisible] = useState(false);
    const flipAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;

    const fetchStats = useCallback(async () => {
      setIsLoading(true);
      try {
          const data = await apiRequest('/flashcards/stats/', 'GET');
          setStats(data);
      } catch (error) {
          Alert.alert('Ошибка', 'Не удалось загрузить статистику.');
      } finally {
          setIsLoading(false);
      }
    }, []);

    useFocusEffect(useCallback(() => {
        if (sessionState === 'stats') fetchStats();
    }, [sessionState, fetchStats]));
  
    const startSession = async () => {
      setIsLoading(true); 
      try {
          // В сессию для изучения отправляем только карточки "на сегодня"
          const data = await apiRequest('/flashcards/review_session/', 'GET');
          if (data.cards && data.cards.length > 0) {
              setCards(data.cards);
              setCurrentIndex(0);
              setIsFlipped(false);
              setSessionState('in_progress'); 
              slideAnim.setValue(0);
              Animated.timing(slideAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
          } else {
              Alert.alert('Отлично!', 'Карточек для изучения на сегодня нет.');
          }
      } catch (error) {
          Alert.alert('Ошибка', 'Не удалось начать сессию.');
      } finally {
          setIsLoading(false);
      }
    };
    
    const handleFlip = () => { if (!isFlipped) { setIsFlipped(true); Animated.spring(flipAnim, { toValue: 1, friction: 8, tension: 10, useNativeDriver: true,}).start();}};
    const submitAnswer = async (quality) => { if(isSubmitting) return; setIsSubmitting(true); const cardId = cards[currentIndex].id; try { await apiRequest(`/flashcards/${cardId}/submit_answer/`, 'POST', { quality }); Animated.timing(slideAnim, { toValue: 2, duration: 300, useNativeDriver: true }).start(() => { if (currentIndex < cards.length - 1) { setCurrentIndex(p => p + 1); setIsFlipped(false); flipAnim.setValue(0); slideAnim.setValue(0); Animated.timing(slideAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(); } else { setSessionState('completed'); }});} catch (e) { Alert.alert('Ошибка', 'Не удалось сохранить ответ.'); } finally { setIsSubmitting(false); }};
    const resetSession = () => { setSessionState('stats'); setCards([]); setCurrentIndex(0);};

    // <-- ИЗМЕНЕНИЕ 3: Создаем обработчик нажатия на чип
    // Он будет переходить на экран CardList, передавая заголовок и объект с фильтрами
    const handleChipPress = (title, filter, ordering = '-updated_at') => {
        navigation.navigate('CardList', { title, filter: { ...filter, ordering } });
    };

    // --- РЕНДЕР-ФУНКЦИИ ---
    // <-- ИЗМЕНЕНИЕ 4: Оборачиваем StatChip в TouchableOpacity и вызываем обработчик
    const renderStats = () => (
      <View style={styles.statsScreenContainer}>
          <View style={styles.header}>
              <Text style={styles.title}>Мои карточки</Text>
              <Text style={styles.subtitle}>Выберите сессию для тренировки</Text>
          </View>
          
          <View style={styles.statsContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, paddingVertical: 10}}>
                  
                  <TouchableOpacity onPress={() => handleChipPress('На сегодня', { is_due: true }, 'next_review')}>
                    <StatChip value={stats?.due_today ?? '...'} label="На сегодня" icon="calendar-outline" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleChipPress('В процессе', { status: 'KN' })}>
                    <StatChip value={stats?.known_cards ?? '...'} label="В процессе" icon="analytics-outline" />
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleChipPress('Изучено', { status: 'LD' })}>
                    <StatChip value={stats?.learned_cards ?? '...'} label="Изучено" icon="checkmark-done-outline" />
                  </TouchableOpacity>
                  
              </ScrollView>
          </View>

          <View style={styles.centeredContent}>
              {isLoading ? (
                  <ActivityIndicator size="large" color="#fff"/>
              ) : (
                  <CardStack 
                      onPress={startSession}
                      cardsDue={stats?.due_today ?? 0}
                  />
              )}
          </View>
      </View>
    );

    // ... функции renderSession и renderCompleted без изменений ...
    const renderSession = () => { return( <View style={styles.sessionContainer}> <View style={styles.progressContainer}> <Text style={styles.progressText}>{currentIndex + 1} / {cards.length}</Text> <View style={styles.progressBar}><View style={[styles.progressFill, {width: `${((currentIndex + 1) / cards.length) * 100}%`}]} /></View> </View> <Animated.View style={[styles.cardContainer, {opacity: slideAnim.interpolate({inputRange: [0, 1, 2],outputRange: [0, 1, 0]}), transform: [{scale: slideAnim.interpolate({inputRange: [0, 1, 2], outputRange: [0.9, 1, 0.9]})}]}]}> <TouchableOpacity activeOpacity={1} onPress={handleFlip} style={{width: '100%', height: '100%'}}> <Animated.View style={[styles.card, styles.cardFront, {transform: [{rotateY: flipAnim.interpolate({inputRange: [0, 1], outputRange: ['0deg', '180deg']})}]}]}> <Text style={styles.cardWord}>{cards[currentIndex].word}</Text> <Text style={styles.cardHint}>Нажмите, чтобы увидеть перевод</Text> </Animated.View> <Animated.View style={[styles.card, styles.cardBack, {transform: [{rotateY: flipAnim.interpolate({inputRange: [0, 1], outputRange: ['180deg', '360deg']})}]}]}> <Text style={styles.cardTranslation}>{cards[currentIndex].translation}</Text> {cards[currentIndex].example && <Text style={styles.cardExample}>"{cards[currentIndex].example}"</Text>} </Animated.View> </TouchableOpacity> </Animated.View> {isFlipped && ( <Animated.View style={styles.answerButtonsContainer}> <TouchableOpacity style={[styles.answerButton, {backgroundColor: '#d9534f'}]} onPress={() => submitAnswer(1)} disabled={isSubmitting}><Text style={styles.answerButtonText}>Снова</Text></TouchableOpacity> <TouchableOpacity style={[styles.answerButton, {backgroundColor: '#f0ad4e'}]} onPress={() => submitAnswer(2)} disabled={isSubmitting}><Text style={styles.answerButtonText}>Трудно</Text></TouchableOpacity> <TouchableOpacity style={[styles.answerButton, {backgroundColor: '#5cb85c'}]} onPress={() => submitAnswer(3)} disabled={isSubmitting}><Text style={styles.answerButtonText}>Хорошо</Text></TouchableOpacity> <TouchableOpacity style={[styles.answerButton, {backgroundColor: '#4298b5'}]} onPress={() => submitAnswer(4)} disabled={isSubmitting}><Text style={styles.answerButtonText}>Легко</Text></TouchableOpacity> </Animated.View> )} </View> );};
    const renderCompleted = () => { return( <View style={[styles.centeredContent, {paddingBottom: 50}]}> <View style={styles.completedIconCircle}><Ionicons name="checkmark-done-circle" size={80} color="#fff" /></View> <Text style={styles.completedTitle}>Сессия завершена!</Text> <Text style={styles.completedSubtitle}>Вы отлично поработали!</Text> <TouchableOpacity style={styles.mainButton} onPress={resetSession}><Ionicons name="home" size={24} color="#2a5298" /><Text style={styles.mainButtonText}>На главный экран</Text></TouchableOpacity> </View> );};

    const renderContent = () => {
      switch(sessionState) {
        case 'stats': return renderStats();
        case 'in_progress': return renderSession();
        case 'completed': return renderCompleted();
        default: return <ActivityIndicator style={{flex: 1}} color="#fff" size="large"/>;
      }
    }

    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.container}>
          {renderContent()}
          {sessionState === 'stats' && !isLoading && (
              <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
                  <Ionicons name="add" size={32} color="#fff" />
              </TouchableOpacity>
          )}
          <AddCardModal 
              visible={isModalVisible}
              onClose={() => setModalVisible(false)}
              onCardAdded={() => {
                  setModalVisible(false);
                  fetchStats();
              }}
          />
      </LinearGradient>
    );
}

// --- СТИЛИ --- (без изменений)
const styles = StyleSheet.create({
    // ... ваш гигантский объект стилей без изменений
    container: { flex: 1 },
    statsScreenContainer: { flex: 1, paddingTop: 60, },
    centeredContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    title: { fontSize: 28, color: '#fff', fontWeight: '700', marginBottom: 5, },
    subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
    statsContainer: {
        marginTop: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: 1, borderBottomWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    statChip: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20, paddingVertical: 10, paddingHorizontal: 15,
        marginRight: 12, flexDirection: 'row', alignItems: 'center',
    },
    statChipValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
    statChipLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
    cardStack: { width: width * 0.75, height: height * 0.35, alignItems: 'center', justifyContent: 'center' },
    cardStackItem: {
        borderRadius: 20, backgroundColor: '#fff',
        width: '100%', height: '100%',
        position: 'absolute',
        shadowColor: "#000", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10,
    },
    cardStackItem1: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f4ff' },
    cardStackItem2: { transform: [{ rotate: '-5deg' }], backgroundColor: '#e1e9ff' },
    cardStackItem3: { transform: [{ rotate: '5deg' }], backgroundColor: '#d1dcfd' },
    cardStackTitle: { fontSize: 24, fontWeight: 'bold', color: '#1e3c72', marginTop: 10 },
    cardStackSubtitle: { fontSize: 16, color: '#2a5298', marginTop: 5 },
    fab: { position: 'absolute', right: 25, bottom: 100, width: 60, height: 60, borderRadius: 30, backgroundColor: '#1e3c72', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: height * 0.8 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    modalTitle: { fontSize: 22, fontWeight: '700', color: '#1e3c72' },
    inputContainer: { flexDirection: 'row', alignItems: 'center' },
    inputLabel: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 15, fontWeight: '500' },
    textInput: { backgroundColor: '#f0f0f0', borderRadius: 10, padding: 15, fontSize: 16, color: '#333' },
    suggestionChip: { padding: 12, backgroundColor: '#e9eef5', borderRadius: 8, marginTop: 8 },
    suggestionText: { color: '#2a5298', fontSize: 15 },
    saveButton: { backgroundColor: '#2a5298', borderRadius: 10, padding: 15, alignItems: 'center', marginTop: 25 },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    sessionContainer: { flex: 1, width: '100%', paddingHorizontal: 20, paddingBottom: 90, },
    progressContainer: { marginTop: 20, marginBottom: 20 },
    progressText: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: '600' },
    progressBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, },
    progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4, },
    cardContainer: { flex: 1, alignItems: 'center', justifyContent: 'center',},
    card: { width: width * 0.85, height: width * 0.85, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 20, backfaceVisibility: 'hidden', position: 'absolute', },
    cardFront: { backgroundColor: '#fff' },
    cardBack: { backgroundColor: '#f1f1f1' },
    cardWord: { fontSize: 34, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center' },
    cardHint: { fontSize: 14, color: '#7f8c8d', position: 'absolute', bottom: 20 },
    cardTranslation: { fontSize: 34, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center' },
    cardExample: { fontSize: 16, color: '#34495e', fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
    answerButtonsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingTop: 20, },
    answerButton: { paddingVertical: 12, borderRadius: 20, alignItems: 'center', flex: 1, marginHorizontal: 5, },
    answerButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    mainButton: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 8},
    mainButtonText: {color: '#2a5298', fontSize: 18, fontWeight: '600', marginLeft: 10},
    completedIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    completedTitle: { fontSize: 28, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 15 },
    completedSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }
});