import React from 'react';
import { Stack } from 'expo-router';
import { Amplify } from 'aws-amplify';
import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react-native';
import outputs from './amplify_outputs.json'; 

Amplify.configure(outputs);

export default function RootLayout() {
  return (
    <Authenticator.Provider>
      <ProtectedLayout>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" /> 
          {/* or any other root routes */}
        </Stack>
      </ProtectedLayout>
    </Authenticator.Provider>
  );
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthenticator((context) => [context.user]);

  if (!user) {
    // If there's no user, show the Amplify Authenticator screens
    return <Authenticator />;
  }

  // Otherwise, render the protected content
  return <>{children}</>;
}
