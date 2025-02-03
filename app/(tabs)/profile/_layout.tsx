import { Stack } from 'expo-router';
import React from 'react';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* The default route: your own profile */}
      <Stack.Screen name="index" />

      {/* A route for viewing another user's profile */}
      <Stack.Screen name="[userIndexId]" />
    </Stack>
  );
}
