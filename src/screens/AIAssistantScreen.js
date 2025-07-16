import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AIAssistantScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>AI Assistant Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' },
  text: { fontSize: 20, color: '#2c3e50' },
});
