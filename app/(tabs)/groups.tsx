import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

type AmplifyGroup = NonNullable<Schema['Group']['type']>;

const client = generateClient<Schema>();

export default function GroupsPage() {
  const router = useRouter();

  const [fetchedUserId, setFetchedUserId] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [groups, setGroups] = useState<AmplifyGroup[]>([]);
  const [groupName, setGroupName] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [leaveGroupId, setLeaveGroupId] = useState<string | null>(null);
  const [groupAdded, setGroupAdded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const sub = session?.tokens?.idToken?.payload?.sub as string;
        const email = session?.tokens?.idToken?.payload?.email as string;
        const nickname = session?.tokens?.idToken?.payload?.nickname as string;
        setFetchedUserId(sub || '');
        setUserEmail(email || '');
        setUserNickname(nickname || '');
      } catch (err) {
        console.error('Error fetching user session:', err);
      }
    })();
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!fetchedUserId) return;
      try {
        const userIndexResponse = await client.models.UserIndex.list({
          filter: { userId: { eq: fetchedUserId } },
        });
        if (isMounted && userIndexResponse.data.length === 0) {
          await client.models.UserIndex.create({
            userId: fetchedUserId,
            email: userEmail,
            RedPill: 'User',
            userNickname,
            photoId: 'public/pfp.webp',
          });
        }
      } catch (error) {
        console.error('Error creating user index:', error);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [fetchedUserId]);

  useEffect(() => {
    (async () => {
      if (!fetchedUserId) return;
      setIsLoading(true);
      try {
        const groupUserResponse = await client.models.GroupUser.list({
          filter: { userId: { eq: fetchedUserId } },
        });
        const groupIds = groupUserResponse.data.map((g) => g.groupId);
        if (groupIds.length > 0) {
          const groupRes = await Promise.all(
            groupIds.map((gid) => client.models.Group.get({ id: gid }))
          );
        
          const userGroups = groupRes
            .map((res) => res.data as AmplifyGroup | null)
            .filter(Boolean) as AmplifyGroup[];
          setGroups(userGroups);
        } else {
          setGroups([]);
        }
      } catch (error) {
        console.error('Error fetching user groups:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [fetchedUserId, groupAdded]);

  useEffect(() => {
    if (!fetchedUserId || !client.models.GroupUser?.onCreate) return;

    const groupUserSub = client.models.GroupUser
      .onCreate({ filter: { userId: { eq: fetchedUserId } } })
      .subscribe({
        next: async (groupUser) => {
          if (groupUser && groupUser.groupId) {
            try {
              const groupResponse = await client.models.Group.get({
                id: groupUser.groupId,
              });
              if (groupResponse?.data) {
                
                setGroups((prev) => [...prev, groupResponse.data as AmplifyGroup]);
              }
            } catch (err) {
              console.error('Error fetching new group:', err);
            }
          }
        },
        error: (err) => console.error('Subscription error:', err),
      });

    return () => groupUserSub.unsubscribe();
  }, [fetchedUserId]);


  useEffect(() => {
    if (!fetchedUserId || !client.models.GroupUser?.onDelete) return;

    const groupUserDeleteSub = client.models.GroupUser
      .onDelete({ filter: { userId: { eq: fetchedUserId } } })
      .subscribe({
        next: (groupUser) => {
          if (groupUser?.groupId) {
            setGroups((prev) => prev.filter((g) => g.id !== groupUser.groupId));
          }
        },
        error: (err) => console.error('Subscription error:', err),
      });

    return () => groupUserDeleteSub.unsubscribe();
  }, [fetchedUserId]);


  useEffect(() => {
    if (deleteGroupId) {
      Alert.alert(
        'Delete Group?',
        'WARNING: This action permanently deletes this chat and all of its messages.',
        [
          { text: 'Cancel', onPress: () => setDeleteGroupId(null) },
          { text: 'Yes, Delete', style: 'destructive', onPress: handleDeleteGroup },
        ]
      );
    }
  }, [deleteGroupId]);

  useEffect(() => {
    if (leaveGroupId) {
      Alert.alert(
        'Leave Group?',
        'Are you sure you want to leave this group?',
        [
          { text: 'Cancel', onPress: () => setLeaveGroupId(null) },
          { text: 'Yes, Leave', style: 'destructive', onPress: confirmLeaveGroup },
        ]
      );
    }
  }, [leaveGroupId]);

  // ========== Handlers ==========

  const handleAddEmail = () => {
    if (emailInput.trim()) {
      setMemberEmails([...memberEmails, emailInput.trim()]);
      setEmailInput('');
    }
  };

  const removeEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
  };

  const createGroup = async () => {
    setIsLoading(true);
  
    if (emailInput.trim()) {
      setMemberEmails((prev) => [...prev, emailInput.trim()]);
      setEmailInput('');
    }
    const updatedEmails = [...memberEmails, emailInput.trim()].filter(Boolean);

    const groupUrlName = groupName.toLowerCase().replace(/\s/g, '-');
    try {
      const userIndexResponse = await client.models.UserIndex.list({
        filter: { userId: { eq: fetchedUserId } },
      });
      if (userIndexResponse.data.length === 0) {
        console.error('No UserIndex found for this user.');
        setIsLoading(false);
        return;
      }
      const userIndexId = userIndexResponse.data[0].id;

      const { data: createdGroup } = await client.models.Group.create({
        groupname: groupName,
        groupUrlName,
        adminId: fetchedUserId,
        chatstatus: 'Def',
        UserIndexId: userIndexId,
      });

      if (!createdGroup) {
        console.error('Error creating group');
        setIsLoading(false);
        return;
      }

      const { data: updatedGroup } = await client.models.Group.update({
        id: createdGroup.id,
        groupUrlName: createdGroup.id,
      });
      if (!updatedGroup) {
        console.error('Error updating group name');
        setIsLoading(false);
        return;
      }

      await client.models.GroupUser.create({
        groupId: createdGroup.id,
        userId: fetchedUserId,
        email: userEmail,
        role: 'admin',
        userNickname,
      });

      for (const email of updatedEmails) {
        try {
          const userIndexRes = await client.models.UserIndex.list({
            filter: { email: { eq: email } },
          });
          if (userIndexRes.data.length > 0) {
            const userRec = userIndexRes.data[0];
            const existingGroupUser = await client.models.GroupUser.list({
              filter: {
                groupId: { eq: createdGroup.id },
                userId: { eq: userRec.userId },
              },
            });
            if (existingGroupUser.data.length === 0) {
              await client.models.GroupUser.create({
                groupId: createdGroup.id,
                userId: userRec.userId,
                email: userRec.email,
                role: 'member',
                userNickname: userRec.userNickname,
              });
            }
          } else {
            console.warn(`${email} not found in the user index.`);
          }
        } catch (err) {
          console.error(`Error adding member ${email}:`, err);
        }
      }

      setGroupName('');
      setMemberEmails([]);

      router.push({
        pathname: '../private-message',
        params: { groupId: updatedGroup.id },
      });
    } catch (err) {
      console.error('Error creating group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupId) return;
    try {
      
      const messagesRes = await client.models.GroupMessage.list({
        filter: { groupId: { eq: deleteGroupId } },
      });
      for (const msg of messagesRes.data) {
        await client.models.GroupMessage.delete({ id: msg.id });
      }
      
      const groupUsersRes = await client.models.GroupUser.list({
        filter: { groupId: { eq: deleteGroupId } },
      });
      for (const gu of groupUsersRes.data) {
        await client.models.GroupUser.delete({ id: gu.id });
      }
      
      await client.models.Group.delete({ id: deleteGroupId });
      setGroups((prev) => prev.filter((g) => g.id !== deleteGroupId));
      setDeleteGroupId(null);
    } catch (err) {
      console.error('Error deleting group:', err);
    }
  };

  const confirmLeaveGroup = async () => {
    if (!leaveGroupId) return;
    try {
      const groupResponse = await client.models.Group.get({
        id: leaveGroupId,
      });
      const groupDetails = groupResponse?.data;
      if (!groupDetails) {
        console.error('Group details not found');
        return;
      }
      const groupUserRes = await client.models.GroupUser.list({
        filter: { groupId: { eq: leaveGroupId }, userId: { eq: fetchedUserId } },
      });
      if (groupUserRes.data.length > 0) {
        await client.models.GroupUser.delete({ id: groupUserRes.data[0].id });
        await client.models.GroupMessage.create({
          groupId: groupDetails.id,
          userId: 'system',
          type: 'system',
          content: `${userNickname} has left the group`,
          userNickname,
        });
        setGroups((prev) => prev.filter((g) => g.id !== leaveGroupId));
        setGroupAdded(!groupAdded);
      }
      setLeaveGroupId(null);
    } catch (err) {
      console.error('Error leaving group:', err);
    }
  };

  // ========== Render ==========

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#999" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Group Chat Rooms</Text>

      {/* CREATE GROUP FORM */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="my cool group name"
          value={groupName}
          onChangeText={setGroupName}
        />
        <TextInput
          style={styles.input}
          placeholder="Enter email and press add"
          value={emailInput}
          onChangeText={setEmailInput}
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
          <Text style={{ color: '#fff' }}>Add Email</Text>
        </TouchableOpacity>

        <View style={styles.emailList}>
          {memberEmails.map((email) => (
            <View key={email} style={styles.emailChip}>
              <Text style={{ marginRight: 8 }}>{email}</Text>
              <TouchableOpacity onPress={() => removeEmail(email)}>
                <Ionicons name="close" size={16} color="red" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.createButton} onPress={createGroup}>
          <Text style={styles.createButtonText}>Create Group</Text>
        </TouchableOpacity>
      </View>

      {/* GROUP LIST */}
      {groups.map((group) => {
        if (!group) return null;
        const isAdmin = group.adminId === fetchedUserId;
        const isActivated = group.chatstatus === 'Activated';

        return (
          <View
            key={group.id}
            style={[
              styles.groupCard,
              { backgroundColor: isActivated ? '#ff6666' : '#7e7e7e' },
            ]}
          >
            {/* Tapping the group -> go to private-message */}
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '../private-message',
                  params: { groupId: group.id },
                })
              }
            >
              <Text style={styles.groupTitle}>{group.groupname}</Text>
            </TouchableOpacity>

            {isAdmin ? (
              <TouchableOpacity
                style={styles.iconRight}
                onPress={() => {
                  setDeleteGroupId(group.id);
                }}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.iconRight}
                onPress={() => {
                  setLeaveGroupId(group.id);
                }}
              >
                <Ionicons name="exit-outline" size={28} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  form: {
    marginBottom: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
  },
  input: {
    backgroundColor: '#fff',
    marginVertical: 6,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  emailList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 6,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ddd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
    marginBottom: 6,
  },
  createButton: {
    backgroundColor: '#8c44ed',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: '600' },
  groupCard: {
    position: 'relative',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  groupTitle: { fontSize: 18, color: '#fff' },
  iconRight: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
});
