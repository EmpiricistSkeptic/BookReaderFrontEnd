// src/screens/WelcomeScreen.js

import React, { useEffect, useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// ================== НАШ НОВЫЙ КОД (НАЧАЛО) ==================
import { GoogleSignin, GoogleSigninButton, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../contexts/AuthContext'; // Убедитесь, что путь к вашему контексту верный
// =================== НАШ НОВЫЙ КОД (КОНЕЦ) ===================

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  // ================== НАШ НОВЫЙ КОД (НАЧАЛО) ==================
  const { signInWithGoogle } = useContext(AuthContext);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      // 1. Проверяем, доступны ли сервисы Google Play (только для Android)
      await GoogleSignin.hasPlayServices();
      
      // 2. Запускаем нативный процесс входа
      const userInfo = await GoogleSignin.signIn();
      
      // 3. Если мы получили idToken, значит все прошло успешно
      if (userInfo.idToken) {
        // 4. Отправляем токен на наш бэкэнд через AuthContext
        await signInWithGoogle(userInfo.idToken);
        // После успешного входа, навигатор в App.js автоматически
        // перенаправит пользователя на главный экран.
      } else {
        throw new Error('Не удалось получить idToken от Google');
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // Пользователь отменил вход, это не ошибка, ничего не делаем
        console.log('Пользователь отменил вход');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // Операция уже выполняется
        console.log('Вход уже в процессе');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // Сервисы Google Play недоступны или устарели
        Alert.alert('Ошибка', 'Сервисы Google Play недоступны или устарели.');
      } else {
        // Какая-то другая ошибка
        console.error('Ошибка входа через Google:', error);
        Alert.alert('Ошибка входа', 'Произошла непредвиденная ошибка. Попробуйте снова.');
      }
    } finally {
      // Вне зависимости от результата, разблокируем кнопки
      setIsSigningIn(false);
    }
  };
  // =================== НАШ НОВЫЙ КОД (КОНЕЦ) ===================

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <LinearGradient
      colors={['#1e3c72', '#2a5298']}
      style={styles.container}
    >
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>  
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>📖</Text>
        </View>
        <Text style={styles.title}>Booklingo</Text>
        <Text style={styles.subtitle}>Learn languages through reading</Text>
      </Animated.View>

      <View style={styles.buttonContainer}>
        {/* ================== НАШ НОВЫЙ КОД (НАЧАЛО) ================== */}
        <GoogleSigninButton
            style={{ width: '100%', height: 50, marginBottom: 15 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleGoogleSignIn}
            disabled={isSigningIn}
        />

        <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
        </View>
        {/* =================== НАШ НОВЫЙ КОД (КОНЕЦ) =================== */}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          disabled={isSigningIn} // Блокируем кнопку
        >
          <Text style={styles.primaryButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Register')}
          disabled={isSigningIn} // Блокируем кнопку
        >
          <Text style={styles.secondaryButtonText}>Register</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// Добавляем новые стили и сохраняем старые
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  header: {
    marginTop: 100,
    alignItems: 'center',
  },
  logoCircle: {
    width: width * 0.3,
    height: width * 0.3,
    borderRadius: (width * 0.3) / 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logoIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 36,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 8,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 60,
  },
  primaryButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 30,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#2a5298',
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#fff',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  // ================== НАШ НОВЫЙ КОД (СТИЛИ) ==================
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    width: 50,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  // =================== НАШ НОВЫЙ КОД (СТИЛИ) ===================
});
