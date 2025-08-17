import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated as RNAnimated, Alert } from 'react-native';
import { PanGestureHandler, TouchableOpacity } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';
import *as Speech from 'expo-speech';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
// --- ИЗМЕНЕНИЕ 1: Импортируем нужные компоненты ---
import { LinearGradient } from 'expo-linear-gradient';
import CompletedView from './CompletedView'; // Убедитесь, что путь правильный
import { apiRequest } from '../../services/ApiService';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3;
const ROTATION_ANGLE = 15;

// Компонент Card остается без изменений
const Card = ({ cardData, onSwipe }) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const flipAnimation = useSharedValue(0);
  const swipeState = useSharedValue(null);
  const ignoreFlipRef = React.useRef(false);

  React.useEffect(() => {
    flipAnimation.value = withTiming(0, { duration: 1 });
    translateX.value = 0;
    translateY.value = 0;
    swipeState.value = null;
  }, [cardData]);

  const flipCard = () => {
    if (ignoreFlipRef.current) {
      ignoreFlipRef.current = false;
      return;
    }
    flipAnimation.value = withSpring(flipAnimation.value === 0 ? 1 : 0);
  };

  const speakWord = () => {
    ignoreFlipRef.current = true;
    if (cardData.word) {
      Speech.speak(cardData.word, { language: 'en' });
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;

      if (translateX.value > SWIPE_THRESHOLD) {
        swipeState.value = 'know';
      } else if (translateX.value < -SWIPE_THRESHOLD) {
        swipeState.value = 'dontKnow';
      } else {
        swipeState.value = null;
      }
    },
    onEnd: () => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const knows = translateX.value > 0;
        translateX.value = withTiming(
          screenWidth * (knows ? 1.5 : -1.5),
          { duration: 300 },
          () => runOnJS(onSwipe)(knows)
        );
      } else {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        swipeState.value = null;
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotateZ: `${interpolate(translateX.value, [-screenWidth / 2, screenWidth / 2], [-ROTATION_ANGLE, ROTATION_ANGLE])}deg` },
    ],
  }));

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flipAnimation.value, [0, 1], [0, 180])}deg` }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flipAnimation.value, [0, 1], [180, 360])}deg` }],
    position: 'absolute',
  }));

  const highlightStyle = useAnimatedStyle(() => {
    const opacityValue = interpolate(Math.abs(translateX.value), [SWIPE_THRESHOLD * 0.5, SWIPE_THRESHOLD], [0, 1], 'clamp');
    let bgColor = 'transparent';
    if (swipeState.value === 'know') {
      bgColor = 'rgba(46, 204, 113, 0.7)';
    } else if (swipeState.value === 'dontKnow') {
      bgColor = 'rgba(231, 76, 60, 0.7)';
    }
    return { backgroundColor: bgColor, opacity: opacityValue };
  });

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} activeOffsetX={[-20, 20]}>
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.card}>
          <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle]}>
            <View style={styles.wordContainer}>
              <Text style={styles.cardWord}>{cardData.word}</Text>
              <TouchableOpacity onPress={speakWord} style={styles.speakerButton}>
                <MaterialIcons name="volume-up" size={32} color="#1e3c72" />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardHint}>Click to see translation</Text>
          </Animated.View>

          <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
            <Text style={styles.cardTranslation}>{cardData.translation}</Text>
            {cardData.example && <Text style={styles.cardExample}>"{cardData.example}"</Text>}
          </Animated.View>

          <Animated.View style={[styles.highlightOverlay, highlightStyle]}>
                <Text style={styles.highlightText}>
                    {swipeState.value === 'know' ? 'I know' : swipeState.value === 'dontKnow' ? 'Dont know' : ''}
                </Text>
            </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// --- ИЗМЕНЕНИЕ 2: Компонент теперь принимает `route` ---
export default function SessionView({ route }) {
  // Получаем карточки из параметров навигации
  const { cards } = route.params;

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [error, setError] = React.useState(false);
  const shakeAnim = React.useRef(new RNAnimated.Value(0)).current;
  const navigation = useNavigation();

  // --- ИЗМЕНЕНИЕ 3: Логика завершения сессии ---
  const isSessionCompleted = !cards || currentIndex >= cards.length;

  // Функция для выхода (и для крестика, и для экрана завершения)
  const handleExitSession = () => {
    navigation.goBack();
  };

  // Функция выхода с подтверждением (для крестика)
  const handleExitWithConfirm = () => {
    Alert.alert(
      "End session?",
      "Are you sure you want to exit? Your progress in this session won't be saved.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Exit", onPress: handleExitSession, style: "destructive" }
      ]
    );
  };
  
  const shakeCard = () => {
    shakeAnim.setValue(0);
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      RNAnimated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // --- ИЗМЕНЕНИЕ 4: Логика отправки ответа на сервер теперь находится здесь ---
  const handleSwipe = async (knows) => {
    try {
      const card = cards[currentIndex];
      if (!card) return;
      
      // Отправляем ответ на сервер
      await apiRequest(`/flashcards/${card.id}/answer/`, 'POST', { knows });

      // Переходим к следующей карточке ТОЛЬКО после успешной отправки
      setCurrentIndex((prev) => prev + 1);
      setError(false);
    } catch (err) {
      console.error("Swipe Error:", err);
      setError(true);
      shakeCard(); // "Трясем" карточку, чтобы дать понять, что нужно повторить свайп
    }
  };

  // Если сессия завершена, показываем CompletedView
  if (isSessionCompleted) {
    return (
      <LinearGradient colors={['#1e3c72', '#2a5298']} style={styles.sessionContainer}>
          <CompletedView onResetSession={handleExitSession} />
      </LinearGradient>
    );
  }

  // Если сессия активна, показываем основной интерфейс
  const animatedShakeStyle = {
    transform: [{ translateX: shakeAnim }],
  };

  return (
    <View style={styles.sessionContainer}>
      <View style={styles.headerContainer}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {Math.min(currentIndex + 1, cards.length)} / {cards.length}
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentIndex + 1) / cards.length) * 100}%` }]} />
          </View>
        </View>
        <TouchableOpacity style={styles.exitButton} onPress={handleExitWithConfirm}>
          <MaterialIcons name="close" size={30} color="rgba(255, 255, 255, 0.8)" />
        </TouchableOpacity>
      </View>
      
      <RNAnimated.View style={[styles.deckContainer, animatedShakeStyle]}>
        <Card cardData={cards[currentIndex]} onSwipe={handleSwipe} />
      </RNAnimated.View>
      {error && <Text style={styles.errorText}>Error sending response. Try again.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  sessionContainer: { flex: 1, width: '100%', padding: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e3c72' },
  headerContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  progressContainer: {
    flex: 1,
    marginRight: 15,
  },
  exitButton: {
    padding: 5,
  },
  progressText: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  deckContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  cardWrapper: { width: screenWidth * 0.85, height: screenWidth, alignItems: 'center', justifyContent: 'center' },
  card: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  cardFace: {
    position: 'absolute',
    width: '100%', height: '100%',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    backfaceVisibility: 'hidden',
  },
  cardFront: { backgroundColor: '#fff' },
  cardBack: { backgroundColor: '#f5f7fa' },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  cardWord: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#1e3c72',
    textAlign: 'center',
  },
  speakerButton: {
    marginLeft: 15,
    padding: 5,
  },
  cardHint: { position: 'absolute', bottom: 20, fontSize: 14, color: '#7f8c8d' },
  cardTranslation: { fontSize: 34, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center' },
  cardExample: { fontSize: 16, color: '#34495e', fontStyle: 'italic', marginTop: 20, textAlign: 'center', paddingHorizontal: 10 },
  highlightOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    pointerEvents: 'none',
  },
  highlightText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    opacity: 0.9,
  },
  errorText: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    color: '#ff4d4f',
    fontWeight: '700',
    textAlign: 'center',
  },
});