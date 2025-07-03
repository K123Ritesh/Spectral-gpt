import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Text,
  Button,
  Searchbar,
  Chip,
  FAB,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

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

export default function HistoryScreen() {
  const [scans, setScans] = useState<AnalysisResult[]>([]);
  const [filteredScans, setFilteredScans] = useState<AnalysisResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useFocusEffect(
    useCallback(() => {
      loadScans();
    }, [])
  );

  useEffect(() => {
    filterScans();
  }, [scans, searchQuery, selectedFilter]);

  const loadScans = async () => {
    try {
      const storedScans = await AsyncStorage.getItem('recentScans');
      if (storedScans) {
        const parsedScans = JSON.parse(storedScans);
        setScans(parsedScans);
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const filterScans = () => {
    let filtered = scans;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.freshness.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.nutritionalValue.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply category filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'excellent':
          filtered = filtered.filter(scan => scan.qualityScore >= 90);
          break;
        case 'good':
          filtered = filtered.filter(scan => scan.qualityScore >= 70 && scan.qualityScore < 90);
          break;
        case 'fair':
          filtered = filtered.filter(scan => scan.qualityScore >= 50 && scan.qualityScore < 70);
          break;
        case 'poor':
          filtered = filtered.filter(scan => scan.qualityScore < 50);
          break;
        case 'warnings':
          filtered = filtered.filter(scan => scan.warnings.length > 0);
          break;
      }
    }

    setFilteredScans(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear all scan history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('recentScans');
              setScans([]);
              setFilteredScans([]);
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          },
        },
      ]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FF9800';
    return '#F44336';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderScanItem = ({ item }: { item: AnalysisResult }) => (
    <Card style={styles.scanCard}>
      <Card.Content>
        <View style={styles.scanHeader}>
          <Text style={styles.fileName}>{item.fileName}</Text>
          <Text style={[styles.score, { color: getScoreColor(item.qualityScore) }]}>
            {item.qualityScore}/100
          </Text>
        </View>
        
        <Text style={styles.date}>{formatDate(item.analysisDate)}</Text>
        
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Freshness</Text>
            <Text style={styles.detailValue}>{item.freshness}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Nutrition</Text>
            <Text style={styles.detailValue}>{item.nutritionalValue}</Text>
          </View>
        </View>

        {item.warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            <Text style={styles.warningText}>⚠️ {item.warnings.join(', ')}</Text>
          </View>
        )}

        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Recommendations:</Text>
          {item.recommendations.slice(0, 2).map((rec, index) => (
            <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
          ))}
        </View>
      </Card.Content>
    </Card>
  );

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'excellent', label: 'Excellent (90+)' },
    { key: 'good', label: 'Good (70-89)' },
    { key: 'fair', label: 'Fair (50-69)' },
    { key: 'poor', label: 'Poor (<50)' },
    { key: 'warnings', label: 'With Warnings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Scan History</Title>
        <Searchbar
          placeholder="Search scans..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        
        <View style={styles.filtersContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item.key}
            renderItem={({ item }) => (
              <Chip
                selected={selectedFilter === item.key}
                onPress={() => setSelectedFilter(item.key)}
                style={styles.filterChip}
              >
                {item.label}
              </Chip>
            )}
          />
        </View>
      </View>

      {filteredScans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {scans.length === 0 
              ? 'No scans yet. Start by scanning your first food item!' 
              : 'No scans match your search criteria.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredScans}
          keyExtractor={(item) => item.id}
          renderItem={renderScanItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {scans.length > 0 && (
        <FAB
          icon="delete"
          style={styles.fab}
          onPress={clearHistory}
          label="Clear History"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 16,
  },
  searchbar: {
    marginBottom: 16,
  },
  filtersContainer: {
    marginBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContainer: {
    padding: 16,
  },
  scanCard: {
    marginBottom: 12,
    elevation: 2,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fileName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  score: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  warningsContainer: {
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  warningText: {
    fontSize: 12,
    color: '#F57C00',
  },
  recommendationsContainer: {
    marginTop: 8,
  },
  recommendationsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  recommendationItem: {
    fontSize: 12,
    color: '#666',
    marginVertical: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
