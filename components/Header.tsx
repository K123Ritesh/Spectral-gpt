import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Appbar, Menu, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';

const Header = () => {
  const [visible, setVisible] = React.useState(false);
  const openMenu = () => setVisible(true);
  const closeMenu = () => setVisible(false);
  const router = useRouter();

  return (
    <Appbar.Header>
      <Appbar.Content title="Spectral GPT" />
      {Platform.OS === 'web' ? (
        <View style={styles.row}>
          <Button onPress={() => router.push('/history')}>History</Button>
          <Button onPress={() => router.push('/profile')}>Profile</Button>
        </View>
      ) : (
        <Menu
          visible={visible}
          onDismiss={closeMenu}
          anchor={<Appbar.Action icon="menu" color="white" onPress={openMenu} />}
        >
          <Menu.Item onPress={() => { router.push('/history'); closeMenu(); }} title="History" />
          <Menu.Item onPress={() => { router.push('/profile'); closeMenu(); }} title="Profile" />
        </Menu>
      )}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
});

export default Header;