// file: src/components/flashcards/SessionView.js

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useAnimatedGestureHandler,
} from 'react-native-reanimated';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.3; // Порог для срабатывания свайпа
const ROTATION_ANGLE = 15; // Угол наклона карточки при свайпе

// --- Компонент для одной карточки (внутренний) ---
const Card = ({ cardData, onSwipe, isActive }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Сбрасываем состояние переворота при смене карточки
  useEffect(() => {
    setIsFlipped(false);
  }, [cardData]);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
    onEnd: (event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        // Улетание карточки за экран
        const knows = event.translationX > 0;
        translateX.value = withTiming(
          screenWidth * (knows ? 1.5 : -1.5),
          { duration: 300 },
          () => runOnJS(onSwipe)(knows)
        );
      } else {
        // Возврат карточки в центр
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      {
        rotateZ: `${interpolate(
          translateX.value,
          [-screenWidth / 2, screenWidth / 2],
          [-ROTATION_ANGLE, ROTATION_ANGLE]
        )}deg`,
      },
    ],
  }));

  const flipAnimation = useSharedValue(isFlipped ? 1 : 0);
  const flipCard = () => {
    flipAnimation.value = withSpring(isFlipped ? 0 : 1);
    setIsFlipped(!isFlipped);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnimation.value, [0, 1], [0, 180])}deg` }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipAnimation.value, [0, 1], [180, 360])}deg` }],
  }));

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} activeOffsetX={[-Infinity, Infinity]}>
      <Animated.View style={[styles.cardWrapper, animatedStyle]}>
        <View style={styles.card}>
          {/* Передняя сторона карточки */}
          <Animated.View style={[styles.cardFace, styles.cardFront, frontAnimatedStyle]}>
            <Text style={styles.cardWord}>{cardData.word}</Text>
            <TouchableOpacity onPress={flipCard} style={styles.cardHintContainer}>
              <Text style={styles.cardHint}>Нажмите, чтобы увидеть перевод</Text>
            </TouchableOpacity>
          </Animated.View>
          {/* Задняя сторона карточки */}
          <Animated.View style={[styles.cardFace, styles.cardBack, backAnimatedStyle]}>
            <TouchableOpacity activeOpacity={1} onPress={flipCard} style={styles.backContent}>
                <Text style={styles.cardTranslation}>{cardData.translation}</Text>
                {cardData.example && <Text style={styles.cardExample}>"{cardData.example}"</Text>}
            </TouchableOpacity>
          </Animated.View>
        </View>
        {/* Полупрозрачные надписи "Знаю"/"Не знаю" */}
        <Animated.View style={[styles.swipeLabel, styles.knowLabel, useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [10, SWIPE_THRESHOLD], [0, 1]) }))]}>
          <Text style={styles.swipeLabelText}>ЗНАЮ</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeLabel, styles.dontKnowLabel, useAnimatedStyle(() => ({ opacity: interpolate(translateX.value, [-10, -SWIPE_THRESHOLD], [0, 1]) }))]}>
          <Text style={styles.swipeLabelText}>НЕ ЗНАЮ</Text>
        </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};


// --- ГЛАВНЫЙ КОМПОНЕНТ ЭКРАНА СЕССИИ ---
export default function SessionView({ cards, onSubmitAnswer, onCardRemoved, onSessionComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Проверяем, остались ли карточки
  useEffect(() => {
    if (currentIndex >= cards.length && cards.length > 0) {
      onSessionComplete();
    }
  }, [currentIndex, cards.length]);

  const handleSwipe = (knows) => {
    const cardId = cards[currentIndex].id;
    // Сначала отправляем ответ на сервер (это может занять время)
    onSubmitAnswer(cardId, knows);
    // Сразу же удаляем карточку из интерфейса, не дожидаясь ответа сервера, для лучшего UX
    onCardRemoved(cardId);
    // Переходим к следующей карточке
    setCurrentIndex(prev => prev + 1);
  };

  if (cards.length === 0 || currentIndex >= cards.length) {
    // Показываем это, пока не сработает onSessionComplete
    return <View style={styles.sessionContainer}><Text style={styles.progressText}>Завершение сессии...</Text></View>;
  }

  return (
    <View style={styles.sessionContainer}>
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>{currentIndex + 1} / {cards.length}</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentIndex + 1) / cards.length) * 100}%` }]} />
        </View>
      </View>
      <View style={styles.deckContainer}>
        {cards.slice(currentIndex, currentIndex + 2).reverse().map((card, index) => {
          // Индекс 0 - нижняя карточка, 1 - верхняя
          const isTopCard = index === (cards.slice(currentIndex, currentIndex + 2).length - 1);
          return (
            <Card
              key={card.id}
              cardData={card}
              onSwipe={handleSwipe}
              isActive={isTopCard}
            />
          );
        })}
      </View>
    </View>
  );
}

// --- Стили ---
const styles = StyleSheet.create({
  sessionContainer: { flex: 1, width: '100%', padding: 20, justifyContent: 'center' },
  progressContainer: { position: 'absolute', top: 60, left: 20, right: 20 },
  progressText: { color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 8, fontSize: 14, fontWeight: '600' },
  progressBar: { height: 8, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 4 },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },
  deckContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardWrapper: {
    width: screenWidth * 0.85,
    height: screenWidth * 0.95,
    position: 'absolute',
  },
  card: { width: '100%', height: '100%', borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardFace: {
    width: '100%', height: '100%', borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', padding: 20,
    backfaceVisibility: 'hidden', position: 'absolute',
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5,
  },
  cardFront: { backgroundColor: '#fff' },
  cardBack: { backgroundColor: '#f5f7fa' },
  cardWord: { fontSize: 34, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center' },
  cardHintContainer: { position: 'absolute', bottom: 20, padding: 10 },
  cardHint: { fontSize: 14, color: '#7f8c8d' },
  backContent: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  cardTranslation: { fontSize: 34, fontWeight: 'bold', color: '#1e3c72', textAlign: 'center' },
  cardExample: { fontSize: 16, color: '#34495e', fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
  swipeLabel: {
    position: 'absolute', top: 40, borderWidth: 3, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 5,
    transform: [{ rotate: '-20deg' }]
  },
  knowLabel: { borderColor: '#5cb85c', left: 20 },
  dontKnowLabel: { borderColor: '#d9534f', right: 20, transform: [{ rotate: '20deg' }] },
  swipeLabelText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
});