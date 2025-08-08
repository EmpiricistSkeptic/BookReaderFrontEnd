// file: src/components/flashcards/CompletedView.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CompletedView({ onResetSession }) {
    return (
        <View style={styles.completedContainer}>
            <View style={styles.completedIconCircle}>
                <Ionicons name="checkmark-done-circle" size={80} color="#fff" />
            </View>
            <Text style={styles.completedTitle}>Сессия завершена!</Text>
            <Text style={styles.completedSubtitle}>Вы отлично поработали!</Text>
            <TouchableOpacity style={styles.mainButton} onPress={onResetSession}>
                <Ionicons name="home" size={24} color="#2a5298" />
                <Text style={styles.mainButtonText}>На главный экран</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    completedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 50},
    mainButton: {flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 30, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5},
    mainButtonText: {color: '#2a5298', fontSize: 18, fontWeight: '600', marginLeft: 10},
    completedIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    completedTitle: { fontSize: 28, color: '#fff', fontWeight: '700', textAlign: 'center', marginBottom: 15 },
    completedSubtitle: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginBottom: 40, paddingHorizontal: 20 }
});