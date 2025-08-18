// App.js

import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ================== НАШ НОВЫЙ КОД (НАЧАЛО) ==================
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Конфигурируем Google Sign-In один раз при запуске приложения
GoogleSignin.configure({
  // Этот ID ОБЯЗАТЕЛЕН. Он говорит Google, для какого бэкенда (вашего Django)
  // предназначен получаемый idToken.
  webClientId: '810125388845-8h7497k526cp1nh6nmnht7us0l6ofgf1.apps.googleusercontent.com',

  // offlineAccess: true гарантирует, что мы получим idToken при каждом входе,
  // что критически важно для нашей схемы.
  offlineAccess: true,
  
  // Эти ID нужны для корректной работы нативного SDK на каждой платформе.
  // Это ваши НОВЫЕ ключи, которые вы только что создали.
  androidClientId: '810125388845-5tialrs4v98rl53j7e2kg0pjhiab0bmb.apps.googleusercontent.com',
  iosClientId: '810125388845-0iabq7p8sc82ejhbga2t8uc9i0bbt79g.apps.googleusercontent.com',
});
// =================== НАШ НОВЫЙ КОД (КОНЕЦ) ===================

import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
import { SelectionProvider } from './src/contexts/SelectionContext';

// Экраны
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';

// --- ИМПОРТИРУЕМ НАШ НОВЫЙ КОМПОНЕНТ С ТАБ-БАРОМ ---
import MainTabs from './src/screens/HomeScreen'; // Файл все еще HomeScreen.js, но экспорт - MainTabs

// Экраны, у которых НЕ ДОЛЖНО быть таб-бара
import BookDetailScreen from './src/screens/BookDetailScreen';
import BookReaderScreen from './src/screens/BookReaderScreen';
import CardListScreen from './src/screens/CardListScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';


const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          // --- ЭКРАНЫ ДЛЯ ЗАЛОГИНЕННОГО ПОЛЬЗОВАТЕЛЯ ---
          <>
            {/* Главный экран - это наш компонент с таб-баром */}
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Экраны, которые должны открываться ПОВЕРХ таб-бара */}
            <Stack.Screen name="CardList" component={CardListScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="BookDetail" component={BookDetailScreen} />
            <Stack.Screen name="BookReader">
              {(props) => (
                <SelectionProvider>
                  <BookReaderScreen {...props} />
                </SelectionProvider>
              )}
            </Stack.Screen>
          </>
        ) : (
          // --- ЭКРАНЫ ДЛЯ НЕЗАЛОГИНЕННОГО ПОЛЬЗОВАТЕЛЯ ---
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppNavigator />
      </GestureHandlerRootView>
    </AuthProvider>
  );
}