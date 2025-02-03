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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
import { Schema } from '../../../amplify/data/resource';
import { useAuthenticator } from '@aws-amplify/ui-react-native';
import { deleteUser } from 'aws-amplify/auth';
import { FontAwesome5 } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';

const client = generateClient<Schema>();

async function pickImage(): Promise<File | null> {
  // Implement your native image picker or remove this if not used
  return null;
}

type AmplifyUserIndex = Schema['UserIndex']['type'];
type Role = 'Owner' | 'Lawyer' | 'User' | 'VIP';

export default function MyProfileScreen() {
  const router = useRouter();
  const { signOut } = useAuthenticator();

  const [profileData, setProfileData] = useState<AmplifyUserIndex | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<Role | null>(null);

  // Editing states
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<Role | ''>('');
  const [isEditingLockedBio, setIsEditingLockedBio] = useState(false);
  const [newLockedBio, setNewLockedBio] = useState('');

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadMyProfile() {
      setLoading(true);
      setErrorMessage('');

      try {
        // 1) Get the current logged-in user SUB
        const session = await fetchAuthSession();
        const currentUserSub = session.tokens?.idToken?.payload?.sub;
        if (!currentUserSub) {
          if (isMounted) {
            setErrorMessage('No current user found. Are you signed in?');
            setLoading(false);
          }
          return;
        }

        // 2) Look up the user’s UserIndex record by userId = sub
        const currUserRes = await client.models.UserIndex.list({
          filter: { userId: { eq: currentUserSub } },
        });
        if (!isMounted) return;

        if (currUserRes.data.length === 0) {
          setErrorMessage('No user index found for this account.');
          setLoading(false);
          return;
        }
        const myIndex = currUserRes.data[0];

        // 3) Save user data & role
        setProfileData(myIndex);
        setCurrentUserRole((myIndex.RedPill as Role) || null);
      } catch (err) {
        console.error('Error fetching my profile data:', err);
        if (isMounted) {
          setErrorMessage('Error fetching profile data');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadMyProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  // ----------------- Handlers ------------------
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

      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        photoId: itemWithPath.path,
      });

      const updatedRes = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedRes.data);
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMessage("Can't use that image");
      setTimeout(() => setErrorMessage(''), 3000);
    }
  }

  async function handleNicknameSave() {
    if (!profileData) return;
    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        userNickname: newNickname,
      });

      // Update any GroupUser records with the new nickname
      const groupUserRes = await client.models.GroupUser.list({
        filter: { userId: { eq: profileData.userId } },
      });
      for (const gu of groupUserRes.data) {
        await client.models.GroupUser.update({
          id: gu.id,
          userNickname: newNickname,
        });
      }

      // Refresh local data
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

  async function handleDeleteAccount() {
    if (!profileData) return;

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action is irreversible.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from all groups (or delete the group if you are admin)
              const groupUserRes = await client.models.GroupUser.list({
                filter: { userId: { eq: profileData.userId } },
              });

              for (const membership of groupUserRes.data) {
                const groupResp = await client.models.Group.get({ id: membership.groupId });
                const group = groupResp.data;
                if (!group) continue;

                if (group.adminId === profileData.userId) {
                  // If you're the admin, let's just delete the entire group
                  await client.models.Group.delete({ id: group.id });
                } else {
                  // Otherwise remove membership
                  await client.models.GroupUser.delete({ id: membership.id });
                  // Post a system message
                  await client.models.GroupMessage.create({
                    groupId: group.id,
                    userId: 'system-id',
                    userNickname: 'System',
                    type: 'system',
                    content: `${profileData.userNickname || 'A user'} has deleted their account.`,
                  });
                }
              }

              // Delete your UserIndex
              await client.models.UserIndex.delete({ id: profileData.id });

              // Delete Auth user
              async function handleDeleteUser() {
                try {
                  await deleteUser();
                } catch (error) {
                  console.log(error);
                }
              }

              await handleDeleteUser();

              // Sign out
              await signOut();

              // Navigate away
              router.replace('/(tabs)/groups');
            } catch (err) {
              console.error('Error deleting account:', err);
              setErrorMessage('Error deleting account. Please try again.');
              setTimeout(() => setErrorMessage(''), 4000);
            }
          },
        },
      ]
    );
  }

  // ----------------- Render ------------------
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

  if (!profileData) {
    // If no error but still no data, just show something
    return (
      <View style={styles.centered}>
        <Text>No profile data found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top row: potentially a "back arrow" if you came from another screen 
          and a "Sign Out" on the right. */}
      <View style={styles.topRow}>
        {/* If you don't want a back arrow on your own profile, you can remove this */}
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

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Nickname Section */}
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
              {/* You can always edit your own nickname */}
              <TouchableOpacity
                onPress={() => {
                  setIsEditingNickname(true);
                  setNewNickname(profileData.userNickname || '');
                }}
                style={{ marginLeft: 8 }}
              >
                <FontAwesome5 name="pen" size={14} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
          <Text style={{ color: 'gray' }}>{profileData.email}</Text>
        </View>

        {/* Bio Section */}
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
              <TouchableOpacity
                onPress={() => {
                  setIsEditingBio(true);
                  setNewBio(profileData.bio || '');
                }}
                style={{ marginLeft: 8 }}
              >
                <FontAwesome5 name="pen" size={14} color="#007AFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Locked Bio (editable if your role is Owner, optional logic) */}
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

        {/* Role (only editable by Owner) */}
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
              {['Owner', 'Lawyer', 'User', 'VIP'].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.roleChoice}
                  onPress={() => setNewRole(r as Role)}
                >
                  <Text>{r}</Text>
                </TouchableOpacity>
              ))}
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

        {/* DELETE ACCOUNT button */}
        <View style={{ marginTop: 24 }}>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete My Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginTop: Platform.OS === 'ios' ? 50 : 20,
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
  deleteAccountButton: {
    backgroundColor: 'red',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
  },
});
