import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Title,
  Paragraph,
  Button,
  Avatar,
  Text,
  Divider,
  Switch,
  List,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

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
  });

  useFocusEffect(
    useCallback(() => {
      loadSettings();
      loadScanStats();
    }, [])
  );

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
        setScanStats({ totalScans, averageScore });
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
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
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
              loadSettings();
              loadScanStats();
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

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Text
          size={80}
          label={user ? getInitials(user.name) : 'U'}
          style={styles.avatar}
        />
        <Title style={styles.userName}>{user?.name || 'User'}</Title>
        <Paragraph style={styles.userEmail}>{user?.email || 'user@example.com'}</Paragraph>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{scanStats.totalScans}</Text>
          <Text style={styles.statLabel}>Total Scans</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{scanStats.averageScore}</Text>
          <Text style={styles.statLabel}>Avg. Score</Text>
        </View>
      </View>

      <List.Section title="Settings" titleStyle={styles.sectionTitle}>
        <SettingItem
          title="Notifications"
          description="Receive notifications about scan results"
          value={settings.notifications}
          onValueChange={(value: boolean) => updateSetting('notifications', value)}
        />
        <SettingItem
          title="Auto-save Scans"
          description="Automatically save scan results to history"
          value={settings.autoSave}
          onValueChange={(value: boolean) => updateSetting('autoSave', value)}
        />
        <SettingItem
          title="High Quality Images"
          description="Use higher quality for better analysis"
          value={settings.highQualityImages}
          onValueChange={(value: boolean) => updateSetting('highQualityImages', value)}
        />
      </List.Section>

      <List.Section title="Danger Zone" titleStyle={styles.sectionTitle}>
        <TouchableOpacity onPress={clearAllData}>
          <List.Item
            title="Clear All Data"
            titleStyle={{ color: Colors.errorDark }}
            left={() => <List.Icon color={Colors.errorDark} icon="delete-sweep" />}
          />
        </TouchableOpacity>
      </List.Section>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          buttonColor={Colors.errorDark}
        >
          Logout
        </Button>
        <Text style={styles.version}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const SettingItem = ({ title, description, value, onValueChange }: any) => (
  <>
    <List.Item
      title={title}
      description={description}
      titleStyle={{ color: Colors.text }}
      descriptionStyle={{ color: Colors.text }}
      right={() => <Switch value={value} onValueChange={onValueChange} />}
    />
    <Divider style={{ backgroundColor: Colors.tertiary }} />
  </>
);

import { Colors } from '../constants/Colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.headerBackground,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.tertiary,
  },
  avatar: {
    backgroundColor: Colors.primary,
  },
  userName: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 16,
    color: Colors.text,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.headerBackground,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.tertiary,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    color: Colors.text,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  logoutButton: {
    width: '100%',
    paddingVertical: 8,
  },
  version: {
    marginTop: 20,
    fontSize: 12,
    color: Colors.text,
  },
});
