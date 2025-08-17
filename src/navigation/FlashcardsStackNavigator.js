// src/navigation/FlashcardsStackNavigator.js

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// --- ИМПОРТИРУЕМ ВСЕ НУЖНЫЕ ЭКРАНЫ ---
import FlashCardsScreen from '../screens/FlashCardsScreen'; // Экран со статистикой
import SessionView from '../components/flashcards/SessionView';      // Экран сессии
import CardListScreen from '../screens/CardListScreen';   // Экран со списком всех карточек

const Stack = createNativeStackNavigator();

export default function FlashcardsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* 
        Первый (стартовый) экран в этой стопке - это экран со статистикой.
        Имя 'FlashcardsHome' - это его внутреннее имя для навигации.
      */}
      <Stack.Screen 
        name="FlashcardsHome" 
        component={FlashCardsScreen} 
      />
      
      {/* 
        Второй экран - это сессия. На него мы будем переходить со статистики.
        Имя 'Session' - для навигации.
      */}
      <Stack.Screen 
        name="Session" 
        component={SessionView} 
      />
      
      {/* 
        Третий экран - это список карточек. На него мы тоже будем переходить со статистики.
        Имя 'CardList' - для навигации.
      */}
      <Stack.Screen 
        name="CardList" 
        component={CardListScreen} 
      />

    </Stack.Navigator>
  );
}