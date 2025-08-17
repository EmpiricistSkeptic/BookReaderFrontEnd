import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 

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
