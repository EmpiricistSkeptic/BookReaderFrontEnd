import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleAuth, registerUser, loginUser } from '../services/AuthService';

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [accessToken,  setAccessToken]  = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading,    setIsLoading]    = useState(true);

  // При старте восстанавливаем сессию
  useEffect(() => {
    (async () => {
      try {
        const [at, rt, u] = await AsyncStorage.multiGet([
          'accessToken',
          'refreshToken',
          'user',
        ]).then(items => items.map(([,v]) => v));

        if (at && rt && u) {
          setAccessToken(at);
          setRefreshToken(rt);
          setUser(JSON.parse(u));
        }
      } catch (err) {
        console.error('Ошибка восстановления сессии:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Сохранение данных в state + AsyncStorage
  const saveAuthData = async (userData, access, refresh) => {
    setUser(userData);
    setAccessToken(access);
    setRefreshToken(refresh);
    await AsyncStorage.multiSet([
      ['user',       JSON.stringify(userData)],
      ['accessToken',access],
      ['refreshToken',refresh],
    ]);
  };

  // — Обычная регистрация
  const signUp = async (userData) => {
    const { user, access, refresh, message } = await registerUser(userData);
    await saveAuthData(user, access, refresh);
    return { success: true, message };
  };

  // — Обычный логин
  const signIn = async (credentials) => {
    const { user, access, refresh, message } = await loginUser(credentials);
    await saveAuthData(user, access, refresh);
    return { success: true, message };
  };

  // — Google OAuth
  const signInWithGoogle = async (idToken) => {
    const { user, access, refresh, message } = await googleAuth(idToken);
    await saveAuthData(user, access, refresh);
    return { success: true, message };
  };

  // — Выход
  const signOut = async () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    await AsyncStorage.clear();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        isAuthenticated: !!user,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

