import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Dimensions,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  Text,
  ActivityIndicator,
  IconButton,
  TextInput,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from '../components/Header';

const { width } = Dimensions.get('window');

interface AnalysisResult {
  id: string;
  fileName: string;
  fileType: string;
  analysisDate: string;
  qualityScore: number;
  freshness: string;
  nutritionalValue: string;
  recommendations: string[];
  warnings: string[];
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string | AnalysisResult;
  imageUri?: string;
}

export default function ScanScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    requestPermissions();
    // Add a welcome message
    setMessages([
      {
        id: 'welcome',
        type: 'bot',
        content: 'Welcome to FoodScan AI! How can I help you analyze your food today?',
      },
    ]);
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      Alert.alert(
        'Permissions Required',
        'Camera and media library permissions are required to scan food items.'
      );
    }
  };

  const saveAnalysisResult = async (result: AnalysisResult) => {
    try {
      const existingScans = await AsyncStorage.getItem('recentScans');
      const scans = existingScans ? JSON.parse(existingScans) : [];
      const updatedScans = [result, ...scans.slice(0, 9)]; // Keep only 10 recent scans
      await AsyncStorage.setItem('recentScans', JSON.stringify(updatedScans));
    } catch (error) {
      console.error('Error saving analysis result:', error);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageSelection(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageSelection(result.assets[0].uri);
    }
  };

  const handleImageSelection = (uri: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: 'Here is the image I want to analyze.',
      imageUri: uri,
    };
    setMessages(prev => [...prev, userMessage]);
    analyzeImage(uri);
  };

  const analyzeImage = async (uri: string) => {
    setLoading(true);
    // Scroll to bottom to show loading indicator
    scrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      // Simulate AI analysis with dummy data
      await new Promise(resolve => setTimeout(resolve, 2000));

      const dummyResult: AnalysisResult = {
        id: Date.now().toString(),
        fileName: 'food_scan.jpg',
        fileType: 'image/jpeg',
        analysisDate: new Date().toISOString(),
        qualityScore: Math.floor(Math.random() * 40) + 60, // 60-100
        freshness: ['Excellent', 'Good', 'Fair', 'Poor'][Math.floor(Math.random() * 4)],
        nutritionalValue: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
        recommendations: [
          'Store in refrigerator',
          'Consume within 2-3 days',
          'Rich in vitamins and minerals',
        ],
        warnings: Math.random() > 0.7 ? ['Check for signs of spoilage'] : [],
      };

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: dummyResult,
      };

      setMessages(prev => [...prev, botMessage]);
      await saveAnalysisResult(dummyResult);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze the image');
    } finally {
      setLoading(false);
      // Scroll to bottom after message is added
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  const renderMessage = (message: Message) => {
    const isBot = message.type === 'bot';
    if (isBot) {
      if (typeof message.content === 'string') {
        return (
          <View key={message.id} style={[styles.messageContainer, styles.botMessage]}>
            <Text style={styles.botMessageText}>{message.content}</Text>
          </View>
        );
      } else {
        const result = message.content as AnalysisResult;
        return (
          <View key={message.id} style={[styles.messageContainer, styles.botMessage]}>
            <Card style={styles.resultCard}>
              <Card.Content>
                <Title>Analysis Results</Title>
                <View style={styles.scoreContainer}>
                  <Text style={styles.scoreLabel}>Quality Score</Text>
                  <Text style={styles.scoreValue}>
                    {result.qualityScore}/100
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Freshness:</Text>
                  <Text style={styles.detailValue}>{result.freshness}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nutritional Value:</Text>
                  <Text style={styles.detailValue}>{result.nutritionalValue}</Text>
                </View>
                {result.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommendations:</Text>
                    {result.recommendations.map((rec, index) => (
                      <Text key={index} style={styles.listItem}>• {rec}</Text>
                    ))}
                  </View>
                )}
                {result.warnings.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Warnings:</Text>
                    {result.warnings.map((warning, index) => (
                      <Text key={index} style={styles.listItem}>• {warning}</Text>
                    ))}
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        );
      }
    } else {
      // User message
      return (
        <View key={message.id} style={[styles.messageContainer, styles.userMessage]}>
          {message.imageUri && (
            <Image source={{ uri: message.imageUri }} style={styles.selectedImage} />
          )}
          <Text style={styles.messageText}>{message.content as string}</Text>
        </View>
      );
    }
  };

  return (
    <>
      <Header />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
      <ScrollView
        style={styles.chatContainer}
        contentContainerStyle={styles.chatContent}
        ref={scrollViewRef}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map(renderMessage)}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" />
            <Text style={styles.loadingText}>Analyzing...</Text>
          </View>
        )}
      </ScrollView>
      <View style={styles.inputContainer}>
        <IconButton icon="camera" onPress={takePhoto} />
        <IconButton icon="image" onPress={pickImage} />
      </View>
      </KeyboardAvoidingView>
    </>
  );
}

import { Colors } from '../constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 10,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
  },
  botMessage: {
    backgroundColor: Colors.cardBackground,
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  botMessageText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 10,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 16,
    color: Colors.text,
  },
  resultCard: {
    backgroundColor: 'transparent',
    elevation: 0,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  scoreLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  scoreValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    color: Colors.text,
  },
  listItem: {
    fontSize: 14,
    marginVertical: 2,
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap:30,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.tertiary,
    backgroundColor: Colors.headerBackground,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.tertiary,
    borderRadius: 20,
    paddingHorizontal: 15,
    marginHorizontal: 10,
    color: Colors.text,
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: Colors.primary,
  },
});
