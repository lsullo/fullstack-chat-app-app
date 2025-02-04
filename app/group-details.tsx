import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Button,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router'; 
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons'; 
import Ionicons from '@expo/vector-icons/Ionicons';

import { generateClient } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
// ------------------- IMPORTANT -------------------
// Import your real schema from the path you have set up:
import { Schema } from '../amplify/data/resource';
// -----------------------------------------------

// Create the Amplify client
const client = generateClient<Schema>();

interface GroupDetailsProps {}

const GroupDetails: React.FC<GroupDetailsProps> = () => {
  const router = useRouter();
  const { groupID } = useLocalSearchParams(); 

  const [loading, setLoading] = useState(true);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [groupDetails, setGroupDetails] = useState<{
    groupId: string;
    groupname: string;
    adminId: string;
    chatstatus: 'Def' | 'Activated';
  } | null>(null);

  const [groupUsers, setGroupUsers] = useState<Array<{
    userIndexId: string;
    userId: string;
    userNickname: string | null;
    photoUrl: string | null;
    email: string | null;
    role: 'Admin' | 'Member' | 'Lawyer';
  }>>([]);

  const [currentUserId, setCurrentUserId] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [userIdToRemove, setUserIdToRemove] = useState<string | null>(null);
  const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const userId = session.tokens?.idToken?.payload.sub as string;
        if (userId) setCurrentUserId(userId);
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!groupID) {
        setLoading(false);
        return;
      }
      try {
        // 1) Fetch Group
        const grpResp = await client.models.Group.get({ id: String(groupID) });
        if (!grpResp.data) {
          setGroupNotFound(true);
          setLoading(false);
          return;
        }

        const g = grpResp.data;
        setGroupDetails({
          groupId: g.id,
          groupname: g.groupname || 'Unnamed Group',
          adminId: g.adminId,
          chatstatus: g.chatstatus ?? 'Def',
        });
        setGroupNameInput(g.groupname || '');

        // 2) Fetch GroupUsers
        const groupUsersResponse = await client.models.GroupUser.list({
          filter: { groupId: { eq: g.id } },
        });

        // 3) Enrich with user data from UserIndex
        const enriched = await Promise.all(
          groupUsersResponse.data.map(async (gu) => {
            const userIdxResp = await client.models.UserIndex.list({
              filter: { userId: { eq: gu.userId } },
            });
            const userIndex = userIdxResp.data[0];

            let mappedRole: 'Admin' | 'Member' | 'Lawyer';
            if (gu.role === 'admin') mappedRole = 'Admin';
            else if (gu.role === 'Lawyer') mappedRole = 'Lawyer';
            else mappedRole = 'Member';

            return {
              userIndexId: userIndex?.id || '',
              userId: gu.userId,
              userNickname: userIndex?.userNickname || 'Anonymous',
              photoUrl: userIndex?.photoId || null,
              email: userIndex?.email || 'No Email',
              role: mappedRole,
            };
          })
        );
        setGroupUsers(enriched);
      } catch (err) {
        console.error('Error fetching group details or users:', err);
        setGroupNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [groupID]);

  // ------------------- Handlers -------------------
  const handleSaveGroupName = async () => {
    if (!groupDetails?.groupId) return;
    try {
      await client.models.Group.update({
        id: groupDetails.groupId,
        groupname: groupNameInput,
      });
      setGroupDetails((prev) => (prev ? { ...prev, groupname: groupNameInput } : null));
      setIsEditingGroupName(false);
    } catch (err) {
      console.error('Error updating group name:', err);
    }
  };

  const handleRemoveMember = async () => {
    if (!userIdToRemove || !groupDetails?.groupId) return;
    try {
      const userObj = groupUsers.find((u) => u.userId === userIdToRemove);
      if (!userObj) return;

      // Example constraint: cannot remove a Lawyer
      if (userObj.role === 'Lawyer') {
        Alert.alert('Cannot remove a Lawyer from the group.');
        setUserIdToRemove(null);
        return;
      }

      // 1) Find the GroupUser record
      const groupUserResp = await client.models.GroupUser.list({
        filter: {
          groupId: { eq: groupDetails.groupId },
          userId: { eq: userIdToRemove },
        },
      });
      const gu = groupUserResp.data[0];
      if (gu) {
        // 2) Delete it
        await client.models.GroupUser.delete({ id: gu.id });
        setGroupUsers((prev) => prev.filter((u) => u.userId !== userIdToRemove));

        // 3) Post a "System message" that user was removed
        const userIndexResp = await client.models.UserIndex.list({
          filter: { userId: { eq: userIdToRemove } },
        });
        const userIndex = userIndexResp.data[0];
        const removedName = userIndex?.userNickname || 'Unknown User';
        await client.models.GroupMessage.create({
          groupId: groupDetails.groupId,
          userId: 'system-user-id',
          type: 'system',
          content: `${removedName} has been removed from the group`,
          userNickname: 'System',
        });
      }
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setUserIdToRemove(null);
    }
  };

  const handleAddMembers = async () => {
    if (!groupDetails?.groupId) return;

    // Combine existing emails in state with what's typed in the box
    const toProcess = [...memberEmails];
    if (emailInput.trim()) {
      toProcess.push(emailInput.trim());
      setEmailInput('');
    }

    try {
      for (const email of toProcess) {
        const idxResp = await client.models.UserIndex.list({
          filter: { email: { eq: email } },
        });
        if (idxResp.data.length > 0) {
          const user = idxResp.data[0];

          // Check if user is already in group
          const guResp = await client.models.GroupUser.list({
            filter: { groupId: { eq: groupDetails.groupId }, userId: { eq: user.userId } },
          });
          if (guResp.data.length === 0) {
            // Add new group user
            await client.models.GroupUser.create({
              groupId: groupDetails.groupId,
              userId: user.userId,
              email: user.email,
              role: 'member',
              userNickname: user.userNickname,
            });

            // Update local state so the UI shows the new user
            setGroupUsers((prev) => [
              ...prev,
              {
                userIndexId: user.id,
                userId: user.userId,
                userNickname: user.userNickname || 'Anonymous',
                photoUrl: user.photoId || null,
                email: user.email || 'No Email',
                role: 'Member',
              },
            ]);

            // System message
            await client.models.GroupMessage.create({
              groupId: groupDetails.groupId,
              userId: 'system-user-id',
              type: 'system',
              content: `${user.userNickname || 'A user'} has been added to the group`,
              userNickname: 'System',
            });
          }
        } else {
          console.warn(`${email} not found in user index.`);
        }
      }
      setMemberEmails([]);
      setEmailInput('');
      setShowAddMemberPopup(false);
    } catch (err) {
      console.error('Error adding members:', err);
    }
  };

  const handleEmailInputChange = (val: string) => {
    setEmailInput(val);
  };
  const handleRemoveEmail = (email: string) => {
    setMemberEmails((prev) => prev.filter((e) => e !== email));
  };

  const handleBack = () => {
    router.back();
  };

  // ------------------- Render -------------------
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  if (groupNotFound) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Group Does Not Exist</Text>
        <Button title="Return Home" onPress={() => router.push('/groups')} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>

        {/* Back Arrow */}
        <TouchableOpacity onPress={handleBack} style={[styles.backButton]}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        {/* Group Title / Edit */}
        <View style={styles.headerWrapper}>
          {isEditingGroupName ? (
            <View style={styles.row}>
              <TextInput
                style={styles.groupNameInput}
                value={groupNameInput}
                onChangeText={setGroupNameInput}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGroupName}>
                <Text style={{ color: '#fff' }}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: '#777' }]}
                onPress={() => setIsEditingGroupName(false)}
              >
                <Text style={{ color: '#fff' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.titleText}>{groupDetails?.groupname}</Text>
              {currentUserId === groupDetails?.adminId && (
                <TouchableOpacity
                  onPress={() => setIsEditingGroupName(true)}
                  style={{ marginLeft: 8 }}
                >
                  <FontAwesome5 name="pen" size={16} color="black" />
                </TouchableOpacity>
              )}
            </View>
          )}
          <Text>Status: {groupDetails?.chatstatus}</Text>
        </View>

        {/* Add Members if admin */}
        {currentUserId === groupDetails?.adminId && (
          <TouchableOpacity
            style={styles.addMembersButton}
            onPress={() => setShowAddMemberPopup(true)}
          >
            <FontAwesome5 name="plus" size={16} color="#fff" />
            <Text style={{ color: '#fff', marginLeft: 8 }}>Add Members</Text>
          </TouchableOpacity>
        )}

        {/* Group Members List */}
        <Text style={styles.membersTitle}>Group Members</Text>
        <ScrollView contentContainerStyle={styles.membersContainer}>
          {groupUsers.map((user) => (
            <View key={user.userId} style={styles.memberCard}>
              {/* 
                You can make the entire card pressable or just the avatar/nickname.
                For clarity, we'll wrap the main "info area" in a TouchableOpacity
                that navigates to user profile if userIndexId is valid.
               */}
              <TouchableOpacity
                style={styles.infoWrapper}
                onPress={() => {
                  if (user.userIndexId) {
                    router.push(`/rprofile?userIndexId=${user.userIndexId}`);
                  }
                }}
              >
             
                {/* Nickname / Email / Role */}
                <Text style={styles.memberNickname}>{user.userNickname}</Text>
                <Text style={styles.memberEmail}>{user.email}</Text>
                <Text style={styles.memberRole}>{user.role}</Text>
              </TouchableOpacity>

              {/* Remove button if admin & not the admin themself & not Lawyer */}
              {currentUserId === groupDetails?.adminId &&
                user.userId !== groupDetails?.adminId &&
                user.role !== 'Lawyer' && (
                  <TouchableOpacity
                    style={styles.removeMemberButton}
                    onPress={() => setUserIdToRemove(user.userId)}
                  >
                    <FontAwesome5 name="times" size={16} color="red" />
                  </TouchableOpacity>
                )}
            </View>
          ))}
        </ScrollView>

        {/* Confirm Remove Modal */}
        <Modal visible={!!userIdToRemove} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text>Are you sure you want to remove this member from the group?</Text>
              <View style={styles.modalButtonsRow}>
                <Button title="Yes, Remove" onPress={handleRemoveMember} />
                <Button title="Cancel" onPress={() => setUserIdToRemove(null)} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Members Modal */}
        <Modal visible={showAddMemberPopup} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Add Members</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email"
                value={emailInput}
                onChangeText={handleEmailInputChange}
              />
              {/* Member emails row */}
              <ScrollView horizontal contentContainerStyle={{ flexWrap: 'wrap', marginVertical: 4 }}>
                {memberEmails.map((email) => (
                  <View key={email} style={styles.emailChip}>
                    <Text>{email}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveEmail(email)}
                      style={{ marginLeft: 8 }}
                    >
                      <Text style={{ color: 'red' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.modalButtonsRow}>
                <Button title="Add Members" onPress={handleAddMembers} />
                <Button title="Cancel" onPress={() => setShowAddMemberPopup(false)} />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default GroupDetails;

/* ------------------- Styles ------------------- */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 16, position: 'relative' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    left: 16,
    zIndex: 10,
  },
  headerWrapper: {
    marginTop: 40, 
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupNameInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    width: 180,
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  titleText: {
    fontSize: 22,
    fontWeight: 'bold',
  },

  addMembersButton: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  membersTitle: {
    fontSize: 18,
    marginVertical: 10,
    fontWeight: 'bold',
  },
  membersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  memberCard: {
    width: 140,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 8,
    margin: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    position: 'relative',
    alignItems: 'center',
  },
  infoWrapper: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  avatarImage: {
    width: 64,
    height: 64,
  },
  memberNickname: {
    fontSize: 16,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 12,
    color: '#666',
  },
  memberRole: {
    fontSize: 12,
    color: '#444',
    marginTop: 2,
  },
  removeMemberButton: {
    position: 'absolute',
    top: 6,
    right: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 14,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ddd',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
});
