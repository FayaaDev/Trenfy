import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
export default function ProfileScreen() {
  return <View style={s.root}><Text style={s.text}>Trenfy</Text></View>;
}
const s = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0F1E' }, text: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' } });
