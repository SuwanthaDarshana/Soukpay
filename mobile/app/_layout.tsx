import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import * as Network from 'expo-network';
import { store, useAppDispatch, useAppSelector } from '../store';
import { initializeAuth } from '../store/slices/authSlice';
import { setOnlineStatus } from '../store/slices/networkSlice';
import { OfflineBanner } from '../components/OfflineBanner';
import { Colors } from '../constants/Colors';

function RootNavigator() {
  const dispatch = useAppDispatch();
  const { isInitialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(initializeAuth());

    if (Platform.OS === 'web') {
      // Browser native online/offline events
      dispatch(setOnlineStatus(navigator.onLine));
      const handleOnline = () => dispatch(setOnlineStatus(true));
      const handleOffline = () => dispatch(setOnlineStatus(false));
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    } else {
      // Native: expo-network listener
      Network.getNetworkStateAsync().then((state) => {
        dispatch(setOnlineStatus(state.isConnected ?? true));
      });
      const subscription = Network.addNetworkStateListener((state) => {
        dispatch(setOnlineStatus(state.isConnected ?? true));
      });
      return () => subscription.remove();
    }
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.navy }}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <OfflineBanner />
    </View>
  );
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <RootNavigator />
    </Provider>
  );
}
