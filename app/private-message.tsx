/* app/private-message.tsx */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Button,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

// Removed unused imports (uuid, uploadData, etc.)
// import { v4 as uuidv4 } from 'uuid';
// import { uploadData } from 'aws-amplify/storage';

import { fetchAuthSession } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';

// ------------------- IMPORTANT -------------------
// Just import your real schema from this path:
import { Schema } from '../amplify/data/resource';
// -----------------------------------------------

// Create the Amplify client (with your real schema)
const client = generateClient<Schema>();

/** Format time helper */
function formatTime(dateVal?: string) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PrivateMessagePage() {
  const router = useRouter();
  const { groupId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [isUserInGroup, setIsUserInGroup] = useState(true);
  const [fetchedUserId, setFetchedUserId] = useState('');
  const [userNickname, setUserNickname] = useState('');
  const [groupDetails, setGroupDetails] = useState<Schema['Group']['type'] | null>(null);
  const [msgs, setMsgs] = useState<Schema['GroupMessage']['type'][]>([]);
  const [fetchedUsers, setFetchedUsers] = useState<
    { userId: string; userNickname: string; userIndexId: string; role: string }[]
  >([]);
  const [msgText, setMsgText] = useState('');
  const [isOverLimit, setIsOverLimit] = useState(false);
  const [shake, setShake] = useState(false);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isPopup2Open, setIsPopup2Open] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const scrollRef = useRef<ScrollView | null>(null);

  
  useEffect(() => {
    (async () => {
      try {
        const session = await fetchAuthSession();
        const sub = session.tokens?.idToken?.payload.sub as string;
        const nick = session.tokens?.idToken?.payload.nickname as string;
        setFetchedUserId(sub);
        setUserNickname(nick);
      } catch (err) {
        console.error('Session error:', err);
      }
    })();
  }, []);

 
  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    (async () => {
      try {
        
        const { data: groupData } = await client.models.Group.get({ id: String(groupId) });
        if (!groupData) {
          setGroupNotFound(true);
          setLoading(false);
          return;
        }
        setGroupDetails(groupData);

        const msgsRes = await client.models.GroupMessage.list({
          filter: { groupId: { eq: groupData.id } },
        });
        
        const sorted = [...msgsRes.data].sort(
          (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
        setMsgs(sorted);
      } catch (error) {
        console.error('Error fetching group or messages:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

 
  useEffect(() => {
    if (!groupDetails?.id) return;
    const subscription = client.models.GroupMessage
      .onCreate({ filter: { groupId: { eq: groupDetails.id } } })
      .subscribe({
        next: (newMsg: Schema['GroupMessage']['type']) => {
          setMsgs((prev) => [...prev, newMsg]);
        },
        error: (err: unknown) => console.error('Message subscription error:', err),
      });

    return () => subscription.unsubscribe();
  }, [groupDetails?.id]);

  useEffect(() => {
    if (!groupDetails?.id || !fetchedUserId) return;
    (async () => {
      try {
       
        const groupUserRes = await client.models.GroupUser.list({
          filter: { groupId: { eq: groupDetails.id } },
        });

        const inGroup = groupUserRes.data.some((gu) => gu.userId === fetchedUserId);
        setIsUserInGroup(inGroup);

        const membersList: {
          userId: string;
          userNickname: string;
          userIndexId: string;
          role: string;
        }[] = [];

        for (const gu of groupUserRes.data) {
          
          const idxResp = await client.models.UserIndex.list({
            filter: { userId: { eq: gu.userId } },
          });
          let role = '';
          let userIndexId = '';
          if (idxResp.data.length > 0) {
            role = idxResp.data[0].RedPill || '';
            userIndexId = idxResp.data[0].id;
          }

          membersList.push({
            userId: gu.userId,
            userNickname: gu.userNickname || '',
            userIndexId,
            role,
          });
        }
        setFetchedUsers(membersList);
      } catch (err) {
        console.error('Error fetching group members:', err);
      }
    })();
  }, [groupDetails?.id, fetchedUserId]);

  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 300);
  }, [msgs]);

  async function handleSubmit() {
    if (!groupDetails?.id) return;

    if (msgText.length > 500) {
      setIsOverLimit(true);
      setShake(true);
      setTimeout(() => {
        setShake(false);
        setIsOverLimit(false);
      }, 600);
      return;
    }

    try {
      const idxRes = await client.models.UserIndex.list({
        filter: { userId: { eq: fetchedUserId } },
      });
      if (idxRes.data.length > 0) {
        setUserNickname(idxRes.data[0].userNickname || '');
      }
    } catch (err) {
      console.error('Error refreshing nickname:', err);
    }

    if (msgText.trim()) {
      try {
        await client.models.GroupMessage.create({
          groupId: groupDetails.id,
          userId: fetchedUserId, 
          userNickname,
          type: 'text',
          content: msgText.trim(),
        });
      } catch (err) {
        console.error('Error sending text:', err);
      } finally {
        setMsgText('');
      }
    }
  }

  function openPopup() {
    setIsPopupOpen(true);
  }
  function closePopup() {
    setIsPopupOpen(false);
  }
  async function handleEmailAddSubmit() {
    if (!groupDetails?.id) return;

    if (emailInput.trim()) {
      setMemberEmails((prev) => [...prev, emailInput.trim()]);
      setEmailInput('');
    }
    const finalEmails = [...memberEmails, emailInput.trim()].filter(Boolean);

    try {
      for (const email of finalEmails) {
        const idxRes = await client.models.UserIndex.list({
          filter: { email: { eq: email } },
        });
        if (idxRes.data.length > 0) {
          const userRec = idxRes.data[0];

          const guCheck = await client.models.GroupUser.list({
            filter: { groupId: { eq: groupDetails.id }, userId: { eq: userRec.userId } },
          });
          if (guCheck.data.length === 0) {
            await client.models.GroupUser.create({
              groupId: groupDetails.id,
              userId: userRec.userId,
              email: userRec.email,
              role: 'member',
              userNickname: userRec.userNickname,
            });
       
            await client.models.GroupMessage.create({
              groupId: groupDetails.id,
              userId: 'system-id',
              userNickname: 'System',
              type: 'system',
              content: `${userRec.userNickname} added to group`,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error adding members:', err);
    } finally {
      closePopup();
    }
  }

  function openPopup2() {
    setIsPopup2Open(true);
  }
  function closePopup2() {
    setIsPopup2Open(false);
  }
  async function handleLeaveGroup() {
    if (!groupDetails?.id || !fetchedUserId) return;
    try {
      const guRes = await client.models.GroupUser.list({
        filter: { groupId: { eq: groupDetails.id }, userId: { eq: fetchedUserId } },
      });
      if (guRes.data.length > 0) {
        await client.models.GroupUser.delete({ id: guRes.data[0].id });
        await client.models.GroupMessage.create({
          groupId: groupDetails.id,
          userId: 'system-id',
          userNickname,
          type: 'system',
          content: `${userNickname} left the group`,
        });
        router.replace('/(tabs)/groups');
      }
    } catch (err) {
      console.error('Error leaving group:', err);
    } finally {
      closePopup2();
    }
  }

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
        <Text style={{ color: 'red', marginBottom: 10 }}>Group Not Found</Text>
        <Button title="Home" onPress={() => router.push('/(tabs)/groups')} />
      </View>
    );
  }
  if (!isUserInGroup) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: 'red', marginBottom: 10 }}>Not Authorized</Text>
        <Button title="Home" onPress={() => router.push('/(tabs)/groups')} />
      </View>
    );
  }

  const me = fetchedUsers.find((u) => u.userId === fetchedUserId);
  const currentUserRole = me?.role || '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View
        style={[
          styles.container,
          groupDetails?.chatstatus === 'Activated' && { backgroundColor: '#000' },
        ]}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.topButton}>
            <Ionicons name="arrow-back" size={22} color="#007AFF" />
          </TouchableOpacity>

          {/* Nicknames row */}
          <ScrollView horizontal style={{ flex: 1 }}>
            {fetchedUsers.map((user, idx) => (
              <TouchableOpacity
                key={`${user.userId}-${idx}`}
                style={{ marginRight: 6 }}
                onPress={() => {
                  if (user.userIndexId) {
                    router.push(`/rprofile?userIndexId=${user.userIndexId}`);
                  }
                }}
              >
                <Text style={styles.headerText}>
                  {user.userNickname}
                  {idx < fetchedUsers.length - 1 ? ', ' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tapping group name goes to group-details */}
          {groupDetails?.id && (
            <TouchableOpacity
              style={[{ position: 'absolute', left: '40%' }]}
              onPress={() => {
                router.push({
                  pathname: '../group-details',
                  params: { groupID: groupDetails.id },
                });
              }}
            >
              <Text style={styles.chatTitle}>{groupDetails?.groupname}</Text>
            </TouchableOpacity>
          )}

          {/* Icons on the right */}
          <View style={styles.headerIconsContainer}>
            {groupDetails?.adminId !== fetchedUserId && (
              <TouchableOpacity onPress={openPopup2} style={{ marginRight: 14 }}>
                <FontAwesome5 name="sign-out-alt" size={20} color="red" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ marginRight: 14 }} onPress={openPopup}>
              <FontAwesome5 name="plus" size={20} color="red" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ADD MEMBERS MODAL */}
        <Modal visible={isPopupOpen} transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={{ fontSize: 18, marginBottom: 8 }}>Add Members</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Enter email"
                value={emailInput}
                onChangeText={setEmailInput}
                onSubmitEditing={handleEmailAddSubmit}
              />
              <ScrollView horizontal contentContainerStyle={{ flexWrap: 'wrap' }}>
                {memberEmails.map((em) => (
                  <View key={em} style={styles.emailChip}>
                    <Text>{em}</Text>
                    <TouchableOpacity
                      onPress={() =>
                        setMemberEmails((prev) => prev.filter((x) => x !== em))
                      }
                    >
                      <Text style={{ marginLeft: 4, color: 'red' }}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.modalButtonsRow}>
                <Button title="Cancel" onPress={() => setIsPopupOpen(false)} />
                <Button title="Add" onPress={handleEmailAddSubmit} />
              </View>
            </View>
          </View>
        </Modal>

        {/* LEAVE GROUP MODAL */}
        <Modal visible={isPopup2Open} transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={{ fontSize: 18, marginBottom: 8 }}>Leave Group?</Text>
              <View style={styles.modalButtonsRow}>
                <Button title="Cancel" onPress={() => setIsPopup2Open(false)} />
                <Button title="Leave" onPress={handleLeaveGroup} />
              </View>
            </View>
          </View>
        </Modal>

        {/* MESSAGES */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView ref={scrollRef} style={styles.messagesContainer}>
            {msgs.map((m) => {
              const isSystem = m.type === 'system';
              const isMine = m.userId === fetchedUserId;
              const matchedUser = fetchedUsers.find((fu) => fu.userId === m.userId);
              const role = matchedUser?.role || '';

              if (isSystem) {
                return (
                  <View
                    key={m.id}
                    style={{ alignSelf: 'center', marginVertical: 4, opacity: 0.6 }}
                  >
                    <Text style={{ fontStyle: 'italic' }}>{m.content}</Text>
                    <Text style={{ fontSize: 10 }}>{formatTime(m.createdAt)}</Text>
                  </View>
                );
              }

              return (
                <View
                  key={m.id}
                  style={[
                    styles.messageWrapper,
                    isMine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' },
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      role === 'Lawyer'
                        ? { backgroundColor: '#FFFACD' }
                        : isMine
                        ? { backgroundColor: '#cce5ff' }
                        : { backgroundColor: '#eaeaea' },
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        if (matchedUser?.userIndexId) {
                          router.push(`/rprofile?userIndexId=${matchedUser.userIndexId}`);
                        }
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        {m.userNickname}{' '}
                        <Text style={{ fontWeight: 'normal', fontSize: 10 }}>
                          {formatTime(m.createdAt)}
                        </Text>
                      </Text>
                    </TouchableOpacity>

                    {m.content ? <Text>{m.content}</Text> : null}
                    {/* Keep displaying images if they exist, but removed sending to implement later */}
                    {m.picId && (
                      <Image
                        source={{ uri: `https://YOUR-S3-OR-CF-DOMAIN/${m.picId}` }}
                        style={styles.messageImage}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 80 }} />
          </ScrollView>

          {/* Compose bar */}
          <View style={styles.composeBar}>
            {/* Removed file picker button here */}
            <TextInput
              style={[
                styles.composeInput,
                isOverLimit && { borderColor: 'red', borderWidth: 1 },
                shake && { transform: [{ translateX: 2 }] },
              ]}
              placeholder="Type your message..."
              value={msgText}
              onChangeText={setMsgText}
            />

            <TouchableOpacity style={styles.sendButton} onPress={handleSubmit}>
              <Text style={{ color: '#fff' }}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

/* ------------------- Styles ------------------- */
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: { flex: 1 },
  topButton: { padding: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    backgroundColor: '#f4f4f4',
  },
  headerText: { fontSize: 14 },
  chatTitle: { fontWeight: 'bold', fontSize: 16 },
  headerIconsContainer: { flexDirection: 'row', alignItems: 'center' },

  messagesContainer: { flex: 1, padding: 8 },
  messageWrapper: { marginVertical: 4, maxWidth: '75%' },
  messageBubble: { padding: 8, borderRadius: 8 },
  messageImage: { width: 180, height: 180, borderRadius: 6, marginTop: 6 },

  composeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    backgroundColor: '#fafafa',
  },
  composeInput: {
    flex: 1,
    marginHorizontal: 6,
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  modalInput: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  emailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ddd',
    borderRadius: 12,
    margin: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
});
