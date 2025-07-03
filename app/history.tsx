import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Title,
  Text,
  Searchbar,
  Chip,
  FAB,
  Card,
  IconButton,
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
        setScans(parsedScans.sort((a: AnalysisResult, b: AnalysisResult) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime()));
      }
    } catch (error) {
      console.error('Error loading scans:', error);
    }
  };

  const filterScans = () => {
    let filtered = scans;

    if (searchQuery) {
      filtered = filtered.filter(scan =>
        scan.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.freshness.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scan.nutritionalValue.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

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
      'Are you sure you want to clear all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('recentScans');
              setScans([]);
            } catch (error) {
              console.error('Error clearing history:', error);
            }
          },
        },
      ]
    );
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#000000';
    if (score >= 60) return '#000000';
    return '#000000';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderScanItem = ({ item }: { item: AnalysisResult }) => (
    <Card style={styles.scanCard}>
      <TouchableOpacity onPress={() => { /* Navigate to detail view? */ }}>
        <Card.Content>
          <View style={styles.scanHeader}>
            <Text style={styles.fileName}>{item.fileName}</Text>
            <Text style={[styles.score, { color: getScoreColor(item.qualityScore) }]}>
              {item.qualityScore}
            </Text>
          </View>
          <Text style={styles.date}>{formatDate(item.analysisDate)}</Text>
          <View style={styles.detailsRow}>
            <Chip icon="food-apple-outline" style={styles.chip}>{item.freshness}</Chip>
            <Chip icon="chart-bar" style={styles.chip}>{item.nutritionalValue}</Chip>
          </View>
          {item.warnings.length > 0 && (
            <Text style={styles.warningText}>⚠️ Contains warnings</Text>
          )}
        </Card.Content>
      </TouchableOpacity>
    </Card>
  );

  const filterOptions = [
    { key: 'all', label: 'All' },
    { key: 'excellent', label: 'Excellent' },
    { key: 'good', label: 'Good' },
    { key: 'fair', label: 'Fair' },
    { key: 'poor', label: 'Poor' },
    { key: 'warnings', label: 'Warnings' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Scan History</Title>
        <Searchbar
          placeholder="Search by name, freshness..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {filterOptions.map(option => (
            <Chip
              key={option.key}
              selected={selectedFilter === option.key}
              onPress={() => setSelectedFilter(option.key)}
              style={[styles.filterChip, selectedFilter === option.key && styles.selectedFilterChip]}
            >
              {option.label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      {filteredScans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {scans.length === 0 ? 'No scans yet.' : 'No scans match your criteria.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredScans}
          keyExtractor={(item) => item.id}
          renderItem={renderScanItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
          }
        />
      )}

      {scans.length > 0 && (
        <FAB
          icon="delete-sweep"
          style={styles.fab}
          onPress={clearHistory}
          label="Clear"
        />
      )}
    </View>
  );
}

import { Colors } from '../constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    paddingTop: 40,
    backgroundColor: Colors.headerBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tertiary,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.text,
  },
  searchbar: {
    marginTop: 16,
    borderRadius: 30,
    elevation: 0,
    backgroundColor: Colors.tertiary,
  },
  filtersContainer: {
    marginTop: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: Colors.tertiary,
  },
  selectedFilterChip: {
    backgroundColor: Colors.primary,
  },
  listContainer: {
    padding: 16,
  },
  scanCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: Colors.cardBackground,
  },
  scanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  fileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  score: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  date: {
    fontSize: 12,
    color: Colors.text,
    marginTop: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chip: {
    marginRight: 8,
    backgroundColor: Colors.tertiary,
  },
  warningText: {
    fontSize: 12,
    color: Colors.error,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.errorDark,
  },
});
