import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Schema } from '../../../amplify/data/resource';
import { Ionicons } from '@expo/vector-icons';

const client = generateClient<Schema>();

type AmplifyUserIndex = Schema['UserIndex']['type'];
type Role = 'Owner' | 'Lawyer' | 'User' | 'VIP';

export default function OtherProfileScreen() {
  const router = useRouter();
  // We read the userIndexId from the route param
  const { userIndexId } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [profileData, setProfileData] = useState<AmplifyUserIndex | null>(null);

  // Info about the *current logged-in user*
  const [myRole, setMyRole] = useState<Role | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadOtherProfile() {
      try {
        if (!userIndexId) {
          setErrorMessage('No user specified.');
          setLoading(false);
          return;
        }

        // 1) Load the param's userIndex record
        const userRes = await client.models.UserIndex.get({ id: String(userIndexId) });
        if (!isMounted) return;

        if (!userRes.data) {
          setErrorMessage('Profile not found');
          setLoading(false);
          return;
        }

        setProfileData(userRes.data);

        // 2) Also fetch the current user’s role
        const session = await fetchAuthSession();
        const mySub = session.tokens?.idToken?.payload?.sub;
        if (!mySub) {
          setLoading(false);
          return;
        }
        // see if we can find my userIndex
        const myIdxRes = await client.models.UserIndex.list({ filter: { userId: { eq: mySub } } });
        if (myIdxRes.data.length > 0) {
          setMyRole(myIdxRes.data[0].RedPill as Role);
        }
      } catch (err) {
        console.error('Error loading other user profile:', err);
        if (isMounted) {
          setErrorMessage('Error loading profile');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOtherProfile();
    return () => {
      isMounted = false;
    };
  }, [userIndexId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading profile...</Text>
      </View>
    );
  }

  if (errorMessage || !profileData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', marginBottom: 8 }}>{errorMessage || 'Unknown error'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: '#007AFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If you want to allow editing (only if myRole === 'Owner'?), you could replicate the code from your own profile. 
  // Otherwise, just show the data read-only:
  return (
    <View style={styles.container}>
      {/* A top bar with a back arrow */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topButton}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={styles.bigText}>
          {profileData.userNickname ?? 'No Nickname'} (Role: {profileData.RedPill})
        </Text>
        <Text style={{ color: '#666', marginTop: 4 }}>{profileData.email}</Text>
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '600' }}>Bio:</Text>
          <Text style={{ marginTop: 4 }}>{profileData.bio || 'No bio provided.'}</Text>
        </View>
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontWeight: '600' }}>Locked Bio:</Text>
          <Text style={{ marginTop: 4 }}>
            {profileData.lockedbio || 'No locked bio provided.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    marginHorizontal: 16,
  },
  topButton: {
    padding: 8,
  },
  bigText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
});
