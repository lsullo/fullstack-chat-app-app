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
          } 
        } catch (error) {
          console.error('Error:', error);
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

useEffect(() => {
  const subscribeToGroupUserCreation = () => {
    if (fetchedUserId && client.models.GroupUser) {
      const groupUserSub = client.models.GroupUser.onCreate({
        filter: {
          userId: { eq: fetchedUserId },
        },
      }).subscribe({
        next: async (groupUser) => {
          if (groupUser && groupUser.groupId) {
            try {
              const groupResponse = await client.models.Group.get({ id: groupUser.groupId });
              if (groupResponse?.data) {
                const newGroup = groupResponse.data as Schema['Group']['type']; 
                setGroups((prevGroups) => [...prevGroups, newGroup]);
              }
            } catch (error) {
              console.error('Error:', error);
            }
          }
        },
        error: (error) => console.error('Error:', error),
      });

      return () => groupUserSub.unsubscribe(); 
    }
  };

  const unsubscribe = subscribeToGroupUserCreation();
  return unsubscribe;
}, [fetchedUserId, client.models.GroupUser]);

useEffect(() => {
  const subscribeToGroupUserDeletion = () => {
    if (fetchedUserId && client.models.GroupUser) {
      const groupUserDeleteSub = client.models.GroupUser.onDelete({
        filter: { userId: { eq: fetchedUserId } },
      }).subscribe({
        next: (groupUser) => {
          if (groupUser && groupUser.groupId) {
            setGroups((prevGroups) => prevGroups.filter(group => group.id !== groupUser.groupId));
          }
        },
        error: (error) => console.error('Error:', error),
      });

      return () => groupUserDeleteSub.unsubscribe(); 
    }
  };

  const unsubscribe = subscribeToGroupUserDeletion();
  return unsubscribe;
}, [fetchedUserId, client.models.GroupUser]);

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
    setIsLoading(true);
  
    if (emailInput.trim() !== '') {
      setMemberEmails((prevEmails) => [...prevEmails, emailInput.trim()]);
      setEmailInput('');
    }
  
    const updatedMemberEmails = [...memberEmails, emailInput.trim()];
  
    const groupUrlName = groupName.toLowerCase().replace(/\s/g, '-');
    try {
      const { data: createdGroup } = await client.models.Group.create({
        groupname: groupName,
        groupUrlName,
        adminId: fetchedUserId,
        role: 'Default',
      });
  
      
      console.log('Created Group Data:', createdGroup);
  
      if (createdGroup) {
        const { data: updatedGroup } = await client.models.Group.update({
          id: createdGroup.id,
          groupUrlName: createdGroup.id, 
        });
  
        if (updatedGroup) {
          setGroupName('');
          const groupUserResponse = await client.models.GroupUser.create({
            groupId: createdGroup.id,
            userId: fetchedUserId,
            email: userEmail,
            role: 'admin',
            userNickname,
          });
  
          if (groupUserResponse) {
            console.log('Group User Created:', groupUserResponse);
            setGroups([...groups, createdGroup] as Schema['Group']['type'][]);
          }
  
          for (const email of updatedMemberEmails) {
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
  
                if (existingGroupUserResponse.data.length === 0) {
                  await client.models.GroupUser.create({
                    groupId: createdGroup.id,
                    userId: user.userId,
                    email: user.email,
                    role: 'member',
                    userNickname: user.userNickname,
                  });
                }
              } else {
                console.warn(`${email} not found in the user index.`);
              }
            } catch (error) {
              console.error(`Error:`, error);
            }
          }
  
          setGroupAdded(true);
          navigate(`/groups/${updatedGroup?.groupUrlName}`); 
        } else {
          console.error('Error updating group:', updatedGroup);
        }
      } else {
        console.error('Error creating group:', createdGroup);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
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
              console.error(`Error:`, errors);
            } 
          })
        );
      } 
      const groupUsersResponse = await client.models.GroupUser.list({
        filter: { groupId: { eq: deleteGroupId } },
      });

      if (groupUsersResponse.data.length > 0) {
        await Promise.all(
          groupUsersResponse.data.map(async (user) => {
            const { errors } = await client.models.GroupUser.delete({ id: user.id });
            if (errors) {
              console.error(`Error:`, errors);
            } 
          })
        );
      } 

      const { errors } = await client.models.Group.delete({ id: deleteGroupId });
      

      if (errors) {
        console.error(`Error:`, errors);
      } else {

        setGroups(groups.filter((group) => group.id !== deleteGroupId));
        setDeleteGroupId(null);
      }
    } catch (error) {
      console.error('Error:', error);
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
        const groupResponse = await client.models.Group.get({ id: leaveGroupId });
        const groupDetails = groupResponse?.data;
  
        if (!groupDetails) {
          console.error('Group details not found');
          return;
        }

        const groupUserResponse = await client.models.GroupUser.list({
          filter: { groupId: { eq: leaveGroupId }, userId: { eq: fetchedUserId } },
        });
  
        if (groupUserResponse.data.length > 0) {
          const groupUser = groupUserResponse.data[0];

          await client.models.GroupUser.delete({ id: groupUser.id });
  
          await client.models.GroupMessage.create({
            groupId: groupDetails.id, 
            type: 'system',
            content: `${userNickname} has left the group`,
            userNickname: userNickname, 
          });

          setGroups(groups.filter((group) => group.id !== leaveGroupId));
          setGroupAdded(!groupAdded);
        }
  
        setLeaveGroupId(null);
        window.location.reload();
      } catch (error) {
        console.error('Error:', error);
      }
    }
  };
  


  const handleCancelLeave = () => {
    setLeaveGroupId(null);
  };



  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <h1 className="text-2xl">Loading...</h1>
      </div>
    );
  }

  return (
    
    <>
      <h1 className="text-3xl text-center mt-12">Group Chat Rooms</h1>
      
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
      
        <section>
  {groups
    .filter((group) => group !== null)
    .map((group) => (
      <article
        key={group.id}
        className={`rounded flex flex-col max-w-screen-md mx-auto p-4 relative ${
          group.role === "Activated" ? "bg-red-500" : "bg-gray-500"
        }`}
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
