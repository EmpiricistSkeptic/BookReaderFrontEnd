// file: src/components/flashcards/StatsView.js

import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// Компонент StatChip остается без изменений, он универсален
const StatChip = ({ value, label, icon, onPress }) => (
    <TouchableOpacity onPress={onPress}>
        <View style={styles.statChip}>
            <Ionicons name={icon} size={22} color="rgba(255,255,255,0.8)" style={{marginRight: 10}}/>
            <View>
                <Text style={styles.statChipValue}>{value}</Text>
                <Text style={styles.statChipLabel}>{label}</Text>
            </View>
        </View>
    </TouchableOpacity>
);

// Компонент CardStack остается без изменений, он получает только число
const CardStack = ({ onPress, cardsDue }) => {
    const pressAnim = useRef(new Animated.Value(1)).current;
    const handlePressIn = () => Animated.spring(pressAnim, { toValue: 0.95, useNativeDriver: true }).start();
    const handlePressOut = () => Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true }).start();
    
    const isDisabled = cardsDue === 0;

    return (
        <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} disabled={isDisabled}>
            <Animated.View style={[styles.cardStack, { transform: [{scale: pressAnim}] }, isDisabled && styles.disabledCardStack]}>
                <View style={[styles.cardStackItem, styles.cardStackItem3]} />
                <View style={[styles.cardStackItem, styles.cardStackItem2]} />
                <View style={[styles.cardStackItem, styles.cardStackItem1]}>
                    <Ionicons name="play-circle-outline" size={60} color={isDisabled ? '#a5b4c8' : '#1e3c72'} />
                    <Text style={[styles.cardStackTitle, isDisabled && styles.disabledText]}>Start session</Text>
                    <Text style={[styles.cardStackSubtitle, isDisabled && styles.disabledText]}>
                        {isDisabled ? 'No cards to review' : `${cardsDue} cards`}
                    </Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

// Главный компонент этого файла
export default function StatsView({ stats, isLoading, onStartSession, onChipPress }) {
    return (
        <View style={styles.statsScreenContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>My cards</Text>
                <Text style={styles.subtitle}>Select a session for training</Text>
            </View>
            
            <View style={styles.statsContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 20, paddingVertical: 10}}>
                    {/* ИЗМЕНЕНИЕ 1: Этот чип остается, так как 'due_today' есть в новой статистике */}
                    <StatChip 
                        value={stats?.due_today ?? '...'} 
                        label="For today" 
                        icon="calendar-outline"
                        onPress={() => onChipPress('For today', { is_due: true })}
                    />
                    {/* ИЗМЕНЕНИЕ 2: Заменяем 'known_cards' на 'learning_now' */}
                    <StatChip 
                        value={stats?.learning_now ?? '...'} 
                        label="On study" 
                        icon="hourglass-outline"
                        // Фильтр теперь будет по is_learning=true и is_due=true
                        onPress={() => onChipPress('On study', { is_due: true, is_learning: true })}
                    />
                    {/* ИЗМЕНЕНИЕ 3: Заменяем 'learned_cards' на 'reviewing' */}
                    <StatChip 
                        value={stats?.reviewing ?? '...'} 
                        label="On repeat" 
                        icon="sync-circle-outline"
                        // Фильтр теперь будет по is_learning=false и is_due=true
                        onPress={() => onChipPress('On repeat', { is_due: true, is_learning: false })}
                    />
                    {/* ИЗМЕНЕНИЕ 4: Добавляем чип для всех карточек */}
                    <StatChip 
                        value={stats?.total_cards ?? '...'} 
                        label="Total cards" 
                        icon="albums-outline"
                        onPress={() => onChipPress('Total cards', {})}
                    />
                </ScrollView>
            </View>

            <View style={styles.centeredContent}>
                {isLoading ? (
                    <ActivityIndicator size="large" color="#fff"/>
                ) : (
                    <CardStack 
                        onPress={onStartSession}
                        cardsDue={stats?.due_today ?? 0}
                    />
                )}
            </View>
        </View>
    );
}

// Стили остаются без изменений
const styles = StyleSheet.create({
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
    disabledCardStack: { opacity: 0.6 },
    disabledText: { color: '#a5b4c8' }
});