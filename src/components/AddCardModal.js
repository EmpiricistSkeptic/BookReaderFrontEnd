// components/AddCardModal.js
import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiRequest } from '../services/ApiService';

const { height } = Dimensions.get('window');

const AddCardModal = ({
  visible,
  onClose,
  onCardAdded,
  initialWord = '',
  initialTranslation = '',
  initialExample = '',
}) => {
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [example, setExample] = useState('');
  const [suggestedExamples, setSuggestedExamples] = useState([]);
  const [suggestedAlternatives, setSuggestedAlternatives] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimeout = useRef(null);

  useEffect(() => {
    if (visible) {
      setWord(initialWord);
      setTranslation(initialTranslation);
      setExample(initialExample);
    } else {
      // очистка при закрытии
      setSuggestedExamples([]);
      setSuggestedAlternatives([]);
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    }
  }, [visible, initialWord, initialTranslation, initialExample]);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);

    if (word.trim().length > 1) {
      debounceTimeout.current = setTimeout(async () => {
        setIsSuggesting(true);
        setSuggestedExamples([]);
        setSuggestedAlternatives([]);
        try {
          const suggestions = await apiRequest('/flashcards/get-suggestions/', 'POST', { word: word.trim() });
          if (suggestions) {
            if (!initialTranslation || word !== initialWord) {
              setTranslation(suggestions.translation || '');
            }
            setSuggestedExamples(suggestions.examples || []);
            const alts = suggestions.alternatives || [];
            setSuggestedAlternatives(alts.filter(a => a.toLowerCase() !== (suggestions.translation || '').toLowerCase()));
          }
        } catch (error) {
          console.error('Suggestion fetch error:', error);
          // не ломаем UX — просто информируем
          Alert.alert('Error', 'Failed to retrieve suggestions.');
        } finally {
          setIsSuggesting(false);
        }
      }, 700);
    } else {
      setSuggestedExamples([]);
      setSuggestedAlternatives([]);
    }

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
        debounceTimeout.current = null;
      }
    };
  }, [word, initialTranslation, initialWord]);

  const handleSave = async () => {
    if (!word.trim() || !translation.trim()) {
      Alert.alert('Error', 'The fields "Word" and "Translation" are required.');
      return;
    }
    setIsSaving(true);
    try {
      await apiRequest('/flashcards/', 'POST', {
        word: word.trim(),
        translation: translation.trim(),
        example: example.trim(),
      });
      Alert.alert('Success', 'The card has been added successfully.');
      handleClose();
      if (typeof onCardAdded === 'function') onCardAdded();
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to save card.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setWord('');
    setTranslation('');
    setExample('');
    setSuggestedExamples([]);
    setSuggestedAlternatives([]);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
      debounceTimeout.current = null;
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleAlternativePress = (alt) => {
    if (!alt) return;
    if (translation.trim() === '') setTranslation(alt);
    else setTranslation(prev => `${prev}, ${alt}`);
  };

  const handleExamplePress = (ex) => {
    if (!ex) return;
    if (example.trim() === '') setExample(ex);
    else setExample(prev => `${prev}\n\n${ex}`);
  };

  const renderAlternatives = () => {
    if (suggestedAlternatives.length === 0) return null;
    return (
      <View style={styles.suggestionSection}>
        <Text style={styles.inputLabel}>Alternative translations</Text>
        <View style={styles.alternativesContainer}>
          {suggestedAlternatives.map((alt, idx) => (
            <TouchableOpacity key={idx} style={styles.alternativeChip} onPress={() => handleAlternativePress(alt)}>
              <Text style={styles.alternativeText}>{alt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderExamples = () => {
    if (suggestedExamples.length === 0) return null;
    return (
      <View style={styles.suggestionSection}>
        <Text style={styles.inputLabel}>Suggested Examples</Text>
        {suggestedExamples.map((ex, idx) => (
          <TouchableOpacity key={idx} style={styles.suggestionChip} onPress={() => handleExamplePress(ex)}>
            <Text style={styles.suggestionText}>{ex}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent={Platform.OS === 'android'}
    >
      {/* Используем flex:1 — Modal уже fullscreen, поэтому позиционировать через flex надежнее */}
      <View style={styles.overlayContainer}>
        {/* затемнённая подложка — ловим нажатие для закрытия */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* сам лист (sheet) внизу */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.sheet}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New card</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={26} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                <Text style={styles.inputLabel}>Word or phrase</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Start typing a word..."
                  placeholderTextColor="#999"
                  value={word}
                  onChangeText={setWord}
                />

                <Text style={styles.inputLabel}>Translation</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    placeholder="The translation will appear here"
                    placeholderTextColor="#999"
                    value={translation}
                    onChangeText={setTranslation}
                  />
                  {isSuggesting && <ActivityIndicator style={{ marginLeft: 10 }} color="#666" />}
                </View>

                {renderAlternatives()}

                <Text style={styles.inputLabel}>Usage example</Text>
                <TextInput
                  style={[styles.textInput, { height: 120, textAlignVertical: 'top' }]}
                  placeholder="Select an example or enter your own"
                  placeholderTextColor="#999"
                  value={example}
                  onChangeText={setExample}
                  multiline
                />

                {renderExamples()}
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveButton, (isSaving || isSuggesting) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={isSaving || isSuggesting}
              >
                {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save card</Text>}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  keyboardAvoid: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  safeArea: {
    width: '100%',
    alignItems: 'stretch',
  },
  sheet: {
    alignSelf: 'stretch',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    minHeight: height * 0.40,
    maxHeight: height * 0.85,
    overflow: 'hidden',
    // тень
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionSection: {
    marginTop: 10,
    marginBottom: 6,
  },
  alternativesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  alternativeChip: {
    backgroundColor: '#f0f6fb',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  alternativeText: {
    color: '#234',
    fontSize: 14,
  },
  suggestionChip: {
    padding: 10,
    backgroundColor: '#f0f6fb',
    borderRadius: 8,
    marginTop: 8,
  },
  suggestionText: {
    color: '#234',
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: 'rgba(30, 60, 114, 0.95)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddCardModal;