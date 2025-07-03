import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import {
  Button,
  Card,
  Title,
  Paragraph,
  FAB,
  Portal,
  Modal,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export default function ScanScreen() {
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<AnalysisResult[]>([]);

  useEffect(() => {
    loadRecentScans();
    requestPermissions();
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

  const loadRecentScans = async () => {
    try {
      const scans = await AsyncStorage.getItem('recentScans');
      if (scans) {
        setRecentScans(JSON.parse(scans));
      }
    } catch (error) {
      console.error('Error loading recent scans:', error);
    }
  };

  const saveAnalysisResult = async (result: AnalysisResult) => {
    try {
      const existingScans = await AsyncStorage.getItem('recentScans');
      const scans = existingScans ? JSON.parse(existingScans) : [];
      const updatedScans = [result, ...scans.slice(0, 9)]; // Keep only 10 recent scans
      await AsyncStorage.setItem('recentScans', JSON.stringify(updatedScans));
      setRecentScans(updatedScans);
    } catch (error) {
      console.error('Error saving analysis result:', error);
    }
  };

  const pickImageFromGallery = async () => {
    setFabOpen(false);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  const takePhoto = async () => {
    setFabOpen(false);
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setModalVisible(true);
    }
  };

  const pickDocument = async () => {
    setFabOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setLoading(true);
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

      setAnalysisResult(dummyResult);
      await saveAnalysisResult(dummyResult);
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze the image');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
    setAnalysisResult(null);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.welcomeCard}>
          <Card.Content>
            <Title style={styles.welcomeTitle}>FoodScan AI</Title>
            <Paragraph style={styles.welcomeText}>
              Scan your food to get instant quality analysis, freshness assessment, and nutritional insights.
            </Paragraph>
          </Card.Content>
        </Card>

        {recentScans.length > 0 && (
          <Card style={styles.recentCard}>
            <Card.Content>
              <Title>Recent Scans</Title>
              {recentScans.slice(0, 3).map((scan) => (
                <View key={scan.id} style={styles.recentItem}>
                  <Text style={styles.recentFileName}>{scan.fileName}</Text>
                  <Text style={styles.recentScore}>Score: {scan.qualityScore}/100</Text>
                </View>
              ))}
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'camera'}
          actions={[
            {
              icon: 'camera',
              label: 'Take Photo',
              onPress: takePhoto,
            },
            {
              icon: 'image',
              label: 'From Gallery',
              onPress: pickImageFromGallery,
            },
            {
              icon: 'file',
              label: 'Pick File',
              onPress: pickDocument,
            },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          style={styles.fab}
        />
      </Portal>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={closeModal}
          contentContainerStyle={styles.modalContainer}
        >
          <ScrollView>
            {selectedImage && (
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
            )}

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Analyzing food quality...</Text>
              </View>
            )}

            {analysisResult && !loading && (
              <Card style={styles.resultCard}>
                <Card.Content>
                  <Title>Analysis Results</Title>
                  <View style={styles.scoreContainer}>
                    <Text style={styles.scoreLabel}>Quality Score</Text>
                    <Text style={[styles.scoreValue, { color: analysisResult.qualityScore >= 80 ? '#4CAF50' : analysisResult.qualityScore >= 60 ? '#FF9800' : '#F44336' }]}>
                      {analysisResult.qualityScore}/100
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Freshness:</Text>
                    <Text style={styles.detailValue}>{analysisResult.freshness}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nutritional Value:</Text>
                    <Text style={styles.detailValue}>{analysisResult.nutritionalValue}</Text>
                  </View>

                  {analysisResult.recommendations.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Recommendations:</Text>
                      {analysisResult.recommendations.map((rec, index) => (
                        <Text key={index} style={styles.listItem}>• {rec}</Text>
                      ))}
                    </View>
                  )}

                  {analysisResult.warnings.length > 0 && (
                    <View style={styles.section}>
                      <Text style={[styles.sectionTitle, { color: '#F44336' }]}>Warnings:</Text>
                      {analysisResult.warnings.map((warning, index) => (
                        <Text key={index} style={[styles.listItem, { color: '#F44336' }]}>• {warning}</Text>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            )}

            <View style={styles.modalButtons}>
              {!analysisResult && !loading && (
                <Button mode="contained" onPress={analyzeImage} style={styles.analyzeButton}>
                  Analyze Food
                </Button>
              )}
              <Button mode="outlined" onPress={closeModal} style={styles.closeButton}>
                {analysisResult ? 'Done' : 'Cancel'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 2,
  },
  welcomeTitle: {
    textAlign: 'center',
    color: '#2E7D32',
    fontSize: 24,
    fontWeight: 'bold',
  },
  welcomeText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  },
  recentCard: {
    marginBottom: 16,
    elevation: 2,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  recentFileName: {
    fontSize: 14,
    color: '#333',
  },
  recentScore: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: '90%',
  },
  selectedImage: {
    width: width - 80,
    height: width - 80,
    borderRadius: 8,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  resultCard: {
    marginBottom: 16,
  },
  scoreContainer: {
    alignItems: 'center',
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  listItem: {
    fontSize: 14,
    marginVertical: 2,
    color: '#666',
  },
  modalButtons: {
    marginTop: 16,
  },
  analyzeButton: {
    marginBottom: 8,
  },
  closeButton: {
    marginTop: 8,
  },
});
