import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  List,
  Avatar,
  Text,
  Divider,
  Switch,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AppSettings {
  notifications: boolean;
  autoSave: boolean;
  highQualityImages: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    notifications: true,
    autoSave: true,
    highQualityImages: false,
  });
  const [scanStats, setScanStats] = useState({
    totalScans: 0,
    averageScore: 0,
    lastScanDate: null as string | null,
  });

  useEffect(() => {
    loadSettings();
    loadScanStats();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await AsyncStorage.getItem('appSettings');
      if (settingsData) {
        setSettings(JSON.parse(settingsData));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadScanStats = async () => {
    try {
      const scansData = await AsyncStorage.getItem('recentScans');
      if (scansData) {
        const scans = JSON.parse(scansData);
        const totalScans = scans.length;
        const averageScore = totalScans > 0 
          ? Math.round(scans.reduce((sum: number, scan: any) => sum + scan.qualityScore, 0) / totalScans)
          : 0;
        const lastScanDate = totalScans > 0 ? scans[0].analysisDate : null;

        setScanStats({
          totalScans,
          averageScore,
          lastScanDate,
        });
      }
    } catch (error) {
      console.error('Error loading scan stats:', error);
    }
  };

  const updateSetting = async (key: keyof AppSettings, value: boolean) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => logout(),
        },
      ]
    );
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will remove all your scan history and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['recentScans', 'appSettings']);
              setSettings({
                notifications: true,
                autoSave: true,
                highQualityImages: false,
              });
              setScanStats({
                totalScans: 0,
                averageScore: 0,
                lastScanDate: null,
              });
              Alert.alert('Success', 'All data has been cleared.');
            } catch (error) {
              console.error('Error clearing data:', error);
              Alert.alert('Error', 'Failed to clear data.');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      {/* User Profile Section */}
      <Card style={styles.profileCard}>
        <Card.Content style={styles.profileContent}>
          <Avatar.Text 
            size={80} 
            label={user ? getInitials(user.name) : 'U'} 
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Title style={styles.userName}>{user?.name || 'User'}</Title>
            <Paragraph style={styles.userEmail}>{user?.email || 'user@example.com'}</Paragraph>
          </View>
        </Card.Content>
      </Card>

      {/* Scan Statistics */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Title>Scan Statistics</Title>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{scanStats.totalScans}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{scanStats.averageScore}</Text>
              <Text style={styles.statLabel}>Avg Score</Text>
            </View>
          </View>
          {scanStats.lastScanDate && (
            <Paragraph style={styles.lastScan}>
              Last scan: {formatDate(scanStats.lastScanDate)}
            </Paragraph>
          )}
        </Card.Content>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Title>Settings</Title>
          
          <List.Item
            title="Notifications"
            description="Receive notifications about scan results"
            right={() => (
              <Switch
                value={settings.notifications}
                onValueChange={(value) => updateSetting('notifications', value)}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="Auto-save Scans"
            description="Automatically save scan results to history"
            right={() => (
              <Switch
                value={settings.autoSave}
                onValueChange={(value) => updateSetting('autoSave', value)}
              />
            )}
          />
          
          <Divider />
          
          <List.Item
            title="High Quality Images"
            description="Use higher quality for better analysis (uses more storage)"
            right={() => (
              <Switch
                value={settings.highQualityImages}
                onValueChange={(value) => updateSetting('highQualityImages', value)}
              />
            )}
          />
        </Card.Content>
      </Card>

      {/* App Information */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Title>About FoodScan AI</Title>
          <Paragraph style={styles.appDescription}>
            FoodScan AI uses advanced machine learning to analyze food quality, 
            freshness, and nutritional value. Get instant insights about your food 
            to make better dietary choices.
          </Paragraph>
          <Paragraph style={styles.version}>Version 1.0.0</Paragraph>
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Button
          mode="outlined"
          onPress={clearAllData}
          style={styles.clearButton}
          textColor="#F44336"
        >
          Clear All Data
        </Button>
        
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor="#F44336"
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileCard: {
    margin: 16,
    elevation: 2,
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#2E7D32',
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  statsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  lastScan: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 12,
    color: '#666',
  },
  settingsCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  appDescription: {
    marginTop: 8,
    lineHeight: 20,
  },
  version: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  clearButton: {
    marginBottom: 12,
    borderColor: '#F44336',
  },
  logoutButton: {
    marginTop: 8,
  },
});
