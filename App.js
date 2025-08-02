import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; 

import { AuthProvider, AuthContext } from './src/contexts/AuthContext';
// --- ИМПОРТИРУЕМ НАШ НОВЫЙ PROVIDER ---
import { SelectionProvider } from './src/contexts/SelectionContext';

// Экраны
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen';
import AIAssistantScreen from './src/screens/AIAssistantScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import DictionaryScreen from './src/screens/DictionaryScreen';
import FlashCardsScreen from './src/screens/FlashCardsScreen';
import { ConversationScreen } from './src/screens/ConversationScreen';
import BookDetailScreen from './src/screens/BookDetailScreen';
import BookReaderScreen from './src/screens/BookReaderScreen';
import CardListScreen from './src/screens/CardListScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { user } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Cards" component={FlashCardsScreen} />
            <Stack.Screen name="CardList" component={CardListScreen} />
            <Stack.Screen name="Assistant" component={AIAssistantScreen} />
            <Stack.Screen name="Dictionary" component={DictionaryScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Conversation" component={ConversationScreen} />
            <Stack.Screen name="BookDetail" component={BookDetailScreen} />
            
            {/* --- КЛЮЧЕВОЕ ИЗМЕНЕНИЕ ЗДЕСЬ --- */}
            {/* Мы оборачиваем ТОЛЬКО BookReaderScreen в SelectionProvider. */}
            {/* Это гарантирует, что состояние выбора слова будет создаваться */}
            {/* только при переходе на этот экран и уничтожаться при выходе. */}
            <Stack.Screen name="BookReader">
              {(props) => (
                <SelectionProvider>
                  <BookReaderScreen {...props} />
                </SelectionProvider>
              )}
            </Stack.Screen>

          </>
        ) : (
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
