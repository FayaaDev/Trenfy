import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// FoundationScreen will be created in Plan 04.
// For now render a minimal Trenfy placeholder.
export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <View style={styles.center}>
          <Text style={styles.brand}>Trenfy</Text>
          <Text style={styles.sub}>Foundation loading...</Text>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0F1E' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { color: '#FFFFFF', fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  sub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 8 },
});
