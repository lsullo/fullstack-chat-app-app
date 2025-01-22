/* app/profile.tsx (Example)
   A React Native version of your web-based ProfilePage
   with fallback to current user if no userIndexId param is given.
*/

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

// AWS Amplify imports
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
import { Schema } from '../../amplify/data/resource';

// Authenticator (for signOut)
import { useAuthenticator } from '@aws-amplify/ui-react-native';

// Icons from Expo Vector Icons
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

// Initialize Amplify client
const client = generateClient<Schema>();

/** 
 * For picking images in React Native, you’d use expo-image-picker. 
 * Below is a placeholder that returns null.
 */
async function pickImage(): Promise<File | null> {
  return null;
}

type AmplifyUserIndex = Schema['UserIndex']['type'];
type Role = 'Owner' | 'Lawyer' | 'User' | 'VIP';

export default function ProfilePage() {
  const router = useRouter();
  // E.g. /profile?userIndexId=someRecordId
  // If none is provided, userIndexId might be undefined
  const { userIndexId } = useLocalSearchParams();

  const { signOut } = useAuthenticator();

  // Profile data
  const [profileData, setProfileData] = useState<AmplifyUserIndex | null>(null);

  // Current user role, e.g. 'Owner', 'User', ...
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);
  const [isSelf, setIsSelf] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Editing state
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<Role | ''>('');
  const [isEditingLockedBio, setIsEditingLockedBio] = useState(false);
  const [newLockedBio, setNewLockedBio] = useState('');

  const [loading, setLoading] = useState(true);

  // ------------------------------------------------------
  // 1. Load Profile: if no userIndexId, fallback to self
  // ------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      setLoading(true);
      setErrorMessage('');

      try {
        // A) Get current user sub from session
        const session = await fetchAuthSession();
        const currentUserSub = session.tokens?.idToken?.payload?.sub;
        if (!currentUserSub) {
          if (isMounted) {
            setErrorMessage('No current user sub found. Are you signed in?');
            setLoading(false);
          }
          return;
        }

        // B) Decide which 'id' to use for UserIndex.get()
        let finalIndexId = userIndexId as string | undefined; // from query param

        if (!finalIndexId) {
          // No param given, so let's find the current user’s record
          // We do a .list() to get the record(s) for userId == sub
          const currUserRes = await client.models.UserIndex.list({
            filter: { userId: { eq: currentUserSub } },
          });
          if (!isMounted) return;

          if (currUserRes.data.length === 0) {
            // current user has no UserIndex record
            setErrorMessage('No user index found for current user');
            setLoading(false);
            return;
          }

          // Use the record's auto-generated "id" for the .get() call
          finalIndexId = currUserRes.data[0].id;
        }

        // C) Now finalIndexId definitely has something
        const userIndexRes = await client.models.UserIndex.get({ id: String(finalIndexId) });
        if (!isMounted) return;

        if (!userIndexRes.data) {
          // Could happen if the param or finalIndexId is invalid
          setErrorMessage('Profile not found');
          setLoading(false);
          return;
        }

        // D) set the profile data
        setProfileData(userIndexRes.data);

        // E) Check if the *current user* is the same as the profile’s user
        const currUserSelfRes = await client.models.UserIndex.list({
          filter: { userId: { eq: currentUserSub } },
        });
        if (!isMounted) return;

        if (currUserSelfRes.data.length > 0) {
          const me = currUserSelfRes.data[0];
          setCurrentUserRole((me.RedPill as Role) || null);
          setIsSelf(me.userId === userIndexRes.data.userId);
        }
      } catch (err) {
        console.error('Error fetching profile data:', err);
        if (isMounted) {
          setErrorMessage('Error fetching profile data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [userIndexId]);

  // ------------------------------------------------------
  // 2. File upload handling (placeholder)
  // ------------------------------------------------------
  async function handleUpload() {
    if (!profileData) return;
    try {
      const chosenFile = await pickImage();
      if (!chosenFile) return;

      const uploadResponse = await uploadData({
        data: chosenFile,
        path: `chat-pics/${chosenFile.name}`,
      });
      const itemWithPath = await uploadResponse.result;

      // Then update user’s photoId
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        photoId: itemWithPath.path,
      });

      // refetch updated profile
      const updatedRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedRes.data);
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMessage("Can't use that image");
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  // ------------------------------------------------------
  // 3. Editing Nickname, Bio, Role, Locked Bio
  // ------------------------------------------------------
  async function handleNicknameSave() {
    if (!profileData) return;
    try {
      // 1) update main userIndex
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        userNickname: newNickname,
      });

      // 2) also update GroupUser records so the new nickname appears in chats
      const groupUserRes = await client.models.GroupUser.list({
        filter: { userId: { eq: profileData.userId } },
      });
      for (const groupUser of groupUserRes.data) {
        await client.models.GroupUser.update({
          id: groupUser.id,
          userNickname: newNickname,
        });
      }

      // 3) refresh
      const updatedProfileRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileRes.data);

      setIsEditingNickname(false);
    } catch (error) {
      console.error('Error updating nickname:', error);
      setErrorMessage('Error updating nickname');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  async function handleBioSave() {
    if (!profileData) return;
    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        bio: newBio,
      });

      const updatedRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedRes.data);

      setIsEditingBio(false);
    } catch (error) {
      console.error('Error updating bio:', error);
      setErrorMessage('Error updating bio');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  async function handleRoleSave() {
    if (!profileData) return;
    if (!newRole) {
      setErrorMessage('Please select a valid role.');
      setTimeout(() => setErrorMessage(''), 3000);
      return;
    }

    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        RedPill: newRole,
      });

      const updatedRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedRes.data);

      setIsEditingRole(false);
    } catch (error) {
      console.error('Error updating role:', error);
      setErrorMessage('Error updating role');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  async function handleLockedBioSave() {
    if (!profileData) return;
    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        lockedbio: newLockedBio,
      });

      const updatedRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedRes.data);

      setIsEditingLockedBio(false);
    } catch (error) {
      console.error('Error updating locked bio:', error);
      setErrorMessage('Error updating locked bio');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  // ------------------------------------------------------
  // 4. Render
  // ------------------------------------------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="gray" />
        <Text>Loading Profile...</Text>
      </View>
    );
  }

  if (errorMessage && !profileData) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', marginBottom: 12 }}>{errorMessage}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: '#007AFF' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // If we have some error but do have partial profileData, we’ll still render below
  return (
    <View style={styles.container}>
      {/* Top row: Back arrow & SignOut button */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.topButton}>
          <Ionicons name="arrow-back" size={22} color="#007AFF" />
        </TouchableOpacity>
        <TouchableOpacity onPress={signOut} style={styles.topButton}>
          <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {errorMessage ? (
        <View style={styles.errorContainer}>
          <Text style={{ color: 'red' }}>{errorMessage}</Text>
        </View>
      ) : null}

      {!profileData ? (
        <View style={styles.centered}>
          <Text>No profile data found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Photo */}
          <View style={styles.photoContainer}>
            {profileData.photoId ? (
              <Image
                source={{ uri: `https://YOUR-S3-OR-CF-URL/${profileData.photoId}` }}
                style={styles.profileImage}
              />
            ) : (
              <Image source={require('../../assets/images/icon.png')} style={styles.profileImage} />
            )}
            {(isSelf || currentUserRole === 'Owner') && (
              <TouchableOpacity
                onPress={handleUpload}
                style={styles.editPhotoButton}
                accessibilityLabel="Edit Profile Picture"
              >
                <FontAwesome5 name="pen" size={14} color="#000" />
              </TouchableOpacity>
            )}
          </View>

          {/* Nickname */}
          <View style={{ marginTop: 12 }}>
            {isEditingNickname ? (
              <>
                <TextInput
                  style={styles.textInput}
                  value={newNickname}
                  onChangeText={setNewNickname}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleNicknameSave}>
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingNickname(false);
                      setNewNickname(profileData.userNickname || '');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.rowCenter}>
                <Text style={styles.bigText}>{profileData.userNickname || 'No Nickname'}</Text>
                {(isSelf || currentUserRole === 'Owner') && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingNickname(true);
                      setNewNickname(profileData.userNickname || '');
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <FontAwesome5 name="pen" size={14} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={{ color: 'gray' }}>{profileData.email}</Text>
          </View>

          {/* Bio */}
          <View style={{ marginTop: 16 }}>
            {isEditingBio ? (
              <>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  multiline
                  value={newBio}
                  onChangeText={setNewBio}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleBioSave}>
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingBio(false);
                      setNewBio(profileData.bio || '');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.rowCenter}>
                <Text style={{ color: '#333', flex: 1 }}>
                  {profileData.bio || 'No bio available.'}
                </Text>
                {(isSelf || currentUserRole === 'Owner') && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingBio(true);
                      setNewBio(profileData.bio || '');
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <FontAwesome5 name="pen" size={14} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Locked Bio */}
          <View style={{ marginTop: 16 }}>
            {isEditingLockedBio ? (
              <>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  multiline
                  value={newLockedBio}
                  onChangeText={setNewLockedBio}
                />
                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleLockedBioSave}>
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingLockedBio(false);
                      setNewLockedBio(profileData.lockedbio || '');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.rowCenter}>
                <Text style={{ color: '#333', flex: 1, fontWeight: 'bold' }}>
                  {profileData.lockedbio || 'No locked bio available.'}
                </Text>
                {currentUserRole === 'Owner' && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingLockedBio(true);
                      setNewLockedBio(profileData.lockedbio || '');
                    }}
                    style={{ marginLeft: 8 }}
                  >
                    <FontAwesome5 name="pen" size={14} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Role */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.rowCenter}>
              <Text style={{ color: '#666' }}>Role: {profileData.RedPill}</Text>
              {currentUserRole === 'Owner' && (
                <TouchableOpacity
                  onPress={() => {
                    setIsEditingRole(true);
                    setNewRole((profileData.RedPill as Role) || '');
                  }}
                  style={{ marginLeft: 8 }}
                >
                  <FontAwesome5 name="pen" size={14} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
            {isEditingRole && (
              <View style={{ marginTop: 8 }}>
                {/* Simple "picker" approach. Replace with a proper RN Picker if you like */}
                <TouchableOpacity
                  style={styles.roleChoice}
                  onPress={() => setNewRole('Owner')}
                >
                  <Text>Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleChoice}
                  onPress={() => setNewRole('Lawyer')}
                >
                  <Text>Lawyer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleChoice}
                  onPress={() => setNewRole('User')}
                >
                  <Text>User</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.roleChoice}
                  onPress={() => setNewRole('VIP')}
                >
                  <Text>VIP</Text>
                </TouchableOpacity>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleRoleSave}>
                    <Text style={{ color: '#fff' }}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsEditingRole(false);
                      setNewRole((profileData.RedPill as Role) || '');
                    }}
                  >
                    <Text style={{ color: '#fff' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

/* ------------------------------ Styles ------------------------------ */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Platform.OS === 'ios' ? 50 : 20, // add safe area if needed
    marginHorizontal: 16,
  },
  topButton: {
    padding: 8,
  },
  backButton: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  errorContainer: {
    padding: 8,
    alignItems: 'center',
  },
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#ccc',
    borderRadius: 20,
    padding: 6,
  },
  bigText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: 'green',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: 'gray',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleChoice: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
    borderRadius: 4,
  },
});
