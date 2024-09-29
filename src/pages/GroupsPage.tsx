import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FaSignOutAlt, FaTimes } from 'react-icons/fa'; 


const GroupsPage = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [fetchedUserId, setFetchedUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<Schema['Group']['type'][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [groupAdded, setGroupAdded] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [userNickname, setUserNickname] = useState('');
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null); 
  const [leaveGroupId, setLeaveGroupId] = useState<string | null>(null); 
  
  const navigate = useNavigate();
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user) {
      fetchAuthSession().then((session) => {
        const userId = session.tokens?.idToken?.payload.sub as string;
        const email = session.tokens?.idToken?.payload.email as string;
        const nickname = session.tokens?.idToken?.payload['nickname'] as string;
        setFetchedUserId(userId);
        setUserEmail(email);
        setUserNickname(nickname);
      });
    } else {
      setFetchedUserId('');
      setUserEmail('');
    }
  }, [user]);

  useEffect(() => {
    const checkAndCreateUserIndex = async () => {
      if (fetchedUserId && client.models.UserIndex) {
        try {
          const userIndexResponse = await client.models.UserIndex.list({
            filter: { userId: { eq: fetchedUserId } },
          });

          if (userIndexResponse.data.length === 0) {
            await client.models.UserIndex.create({
              userId: fetchedUserId,
              email: userEmail,
              role: 'User',
              userNickname,
            });
            console.log('UserIndex created for new user.');
          } else {
            console.log('UserIndex already exists for this user.');
          }
        } catch (error) {
          console.error('Error during UserIndex creation:', error);
        }
      }
    };

    if (fetchedUserId) {
      checkAndCreateUserIndex();
    }
  }, [fetchedUserId, client.models.UserIndex, userEmail]);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (fetchedUserId && client.models.GroupUser) {
        setIsLoading(true);
        try {
          const groupUserResponse = await client.models.GroupUser.list({
            filter: { userId: { eq: fetchedUserId } },
          });
          const groupIds = groupUserResponse.data.map((groupUser) => groupUser.groupId);
          if (groupIds.length > 0) {
            const groupResponses = await Promise.all(
              groupIds.map((groupId) => client.models.Group.get({ id: groupId }))
            );
            const userGroups = groupResponses.map((res) => res.data as Schema['Group']['type']);
            setGroups(userGroups);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchUserGroups();
  }, [fetchedUserId, groupAdded]);

  const handleEmailInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailInput(e.target.value);
  };

  const handleEmailInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput.trim() !== '') {
      e.preventDefault();
      setMemberEmails([...memberEmails, emailInput.trim()]);
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
  };

  const handleCreateGroupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const groupUrlName = groupName.toLowerCase().replace(/\s/g, '-');
    try {
      const { data: createdGroup } = await client.models.Group.create({
        groupname: groupName,
        groupUrlName,
        adminId: fetchedUserId,
      });
      if (createdGroup) {
        setGroupName('');
        const groupUserResponse = await client.models.GroupUser.create({
          groupId: createdGroup.id,
          userId: fetchedUserId,
          email: userEmail,
          role: 'admin',
          userNickname,
        });
        if (groupUserResponse) setGroups([...groups, createdGroup] as Schema['Group']['type'][]);

        for (const email of memberEmails) {
          try {
            const userIndexResponse = await client.models.UserIndex.list({
              filter: { email: { eq: email } },
            });

            if (userIndexResponse.data.length > 0) {
              const user = userIndexResponse.data[0];
              const existingGroupUserResponse = await client.models.GroupUser.list({
                filter: {
                  groupId: { eq: createdGroup.id },
                  userId: { eq: user.userId },
                },
              });

              if (existingGroupUserResponse.data.length === 0)
                await client.models.GroupUser.create({
                  groupId: createdGroup.id,
                  userId: user.userId,
                  email: user.email,
                  role: 'member',
                  userNickname: user.userNickname,
                });
            } else {
              console.warn(`User with email ${email} not found in UserIndex`);
            }
          } catch (error) {
            console.error(`Error adding user with email ${email}:`, error);
          }
        }

        setGroupAdded(true);
        navigate(`/groups/${createdGroup.groupUrlName}`);
      } else {
        console.error('Error:', createdGroup);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteClick = (groupId: string) => {
    setDeleteGroupId(groupId);
  };

const handleDeleteGroup = async () => {
  if (deleteGroupId) {
    try {

      const messagesResponse = await client.models.GroupMessage.list({
        filter: { groupId: { eq: deleteGroupId } },
      });

      if (messagesResponse.data.length > 0) {
        await Promise.all(
          messagesResponse.data.map(async (message) => {
            const { errors } = await client.models.GroupMessage.delete({ id: message.id });
            if (errors) {
              console.error(`Error deleting message with ID: ${message.id}`, errors);
            } else {
              console.log(`Deleted message with ID: ${message.id}`);
            }
          })
        );
      } else {
        console.log('No messages found to delete.');
      }

      const groupUsersResponse = await client.models.GroupUser.list({
        filter: { groupId: { eq: deleteGroupId } },
      });

      if (groupUsersResponse.data.length > 0) {
        await Promise.all(
          groupUsersResponse.data.map(async (user) => {
            const { errors } = await client.models.GroupUser.delete({ id: user.id });
            if (errors) {
              console.error(`Error deleting group user with ID: ${user.id}`, errors);
            } else {
              console.log(`Deleted group user with ID: ${user.id}`);
            }
          })
        );
      } else {
        console.log('No group users found to delete.');
      }

      const { errors } = await client.models.Group.delete({ id: deleteGroupId });
      if (errors) {
        console.error(`Error deleting group with ID: ${deleteGroupId}`, errors);
      } else {
        console.log(`Deleted group with ID: ${deleteGroupId}`);

        setGroups(groups.filter((group) => group.id !== deleteGroupId));
        setDeleteGroupId(null);
      }
    } catch (error) {
      console.error('Error deleting group and its associated data:', error);
    }
  }
};

  const handleCancelDelete = () => {
    setDeleteGroupId(null);
  };

  const handleLeaveClick = (groupId: string) => {
    setLeaveGroupId(groupId);
  };

  const handleConfirmLeaveGroup = async () => {
    if (leaveGroupId) {
      try {
        const groupUserResponse = await client.models.GroupUser.list({
          filter: { groupId: { eq: leaveGroupId }, userId: { eq: fetchedUserId } },
        });

        if (groupUserResponse.data.length > 0) {
          const groupUser = groupUserResponse.data[0];
          await client.models.GroupUser.delete({ id: groupUser.id });

          const timestamp = new Date().toISOString();
          const leaveMessage = `User ${userNickname || userEmail} left group at ${timestamp}`;
          console.log(leaveMessage); 

          setGroups(groups.filter((group) => group.id !== leaveGroupId));
          setGroupAdded(!groupAdded);
        }

        setLeaveGroupId(null);
        window.location.reload(); 
      } catch (error) {
        console.error('Error removing user from group:', error);
      }
    }
  };


  const handleCancelLeave = () => {
    setLeaveGroupId(null);
  };



  return (
    <>
      <h1 className="text-3xl text-center mt-12">Group Chat Rooms</h1>
      {isLoading ? (
        <div className="text-center">Loading...</div>
      ) : (
        <div className="my-8 w-full">
          <div className="flex flex-col items-center">
            <form onSubmit={handleCreateGroupSubmit}>
              <input
                className="input input-md input-primary mr-2"
                placeholder="my cool group name"
                value={groupName}
                required
                onChange={(e) => setGroupName(e.target.value)}
              />
              <input
                className="input input-md input-primary mr-2 mt-2"
                placeholder="Enter email and press Enter"
                value={emailInput}
                onChange={handleEmailInputChange}
                onKeyDown={handleEmailInputKeyDown}
              />
              <div className="flex flex-wrap mt-2">
                {memberEmails.map((email) => (
                  <div key={email} className="bg-gray-200 p-2 m-1 rounded flex items-center">
                    <span>{email}</span>
                    <button
                      type="button"
                      className="ml-2 text-red-600"
                      onClick={() => handleRemoveEmail(email)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center">
                <button type="submit" className="btn btn-secondary mt-4">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
<section>
  {groups
    .filter((group) => group !== null)
    .map((group) => (
      <article
        key={group.id}
        className="bg-accent rounded flex flex-col max-w-screen-md mx-auto p-4 relative"
      >
        <Link
          className="text-2xl text-primary-content"
          to={`/groups/${group.groupUrlName}`}
        >
          <div className="h-24 flex justify-center items-center">
            {group.groupname}
          </div>
        </Link>
        {group.adminId === fetchedUserId ? (
          <FaTimes
            className="absolute top-15 right-6 text-3xl text-primary-content"
            onClick={() => handleDeleteClick(group.id)}
          />
            
          
        ) : (
          <FaSignOutAlt
            className="absolute top-15 right-6 text-3xl text-primary-content cursor-pointer"
            onClick={() => handleLeaveClick(group.id)} 
            title="Leave Group"
          />
        )}
      </article>
    ))}
</section>

      {deleteGroupId && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-md">
            <p>WARNING: This action permanently deletes this chat and all of its existing messages.</p>
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-danger mr-2"
                onClick={handleDeleteGroup}
              >
                Yes, Delete
              </button>
              <button className="btn btn-secondary" onClick={handleCancelDelete}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {leaveGroupId && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
          <div className="bg-white p-4 rounded shadow-md">
            <p>Are you sure you want to leave this group?</p>
            <div className="flex justify-end mt-4">
              <button
                className="btn btn-danger mr-2"
                onClick={handleConfirmLeaveGroup}
              >
                Yes, Leave
              </button>
              <button className="btn btn-secondary" onClick={handleCancelLeave}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default GroupsPage;
