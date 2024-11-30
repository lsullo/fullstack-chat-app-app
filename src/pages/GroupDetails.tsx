import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { FaPen, FaTimes, FaPlus, FaArrowLeft } from 'react-icons/fa';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();

const GroupDetails = () => {
  const { groupID } = useParams();
  const navigate = useNavigate(); 
  const [loading, setLoading] = useState(true);
  const [groupNotFound, setGroupNotFound] = useState(false);
  const [groupDetails, setGroupDetails] = useState<{
    groupId: string;
    groupname: string;
    adminId: string;
    chatstatus: 'Def' | 'Activated';
  } | null>(null);

  const [groupUsers, setGroupUsers] = useState<
    Array<{
      userIndexId: string;
      userId: string;
      userNickname: string | null;
      photoUrl: string | null;
      email: string | null;
      role: 'Admin' | 'Member';
    }>
  >([]);

  const [currentUserId, setCurrentUserId] = useState('');
  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [userIdToRemove, setUserIdToRemove] = useState<string | null>(null);
  const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [memberEmails, setMemberEmails] = useState<string[]>([]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const session = await fetchAuthSession();
        const userId = session.tokens?.idToken?.payload.sub;

        if (userId) {
          setCurrentUserId(userId);
        } else {
          console.error('User ID not found in session payload.');
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const groupResponse = await client.models.Group.get({ id: groupID || '' });
        if (!groupResponse.data) {
          setGroupNotFound(true);
          setLoading(false);
          return;
        }

        const groupData = groupResponse.data;
        setGroupDetails({
          groupId: groupData.id,
          groupname: groupData.groupname || 'Unnamed Group',
          adminId: groupData.adminId,
          chatstatus: groupData.chatstatus ?? 'Def',
        });

        setGroupNameInput(groupData.groupname || '');

        const groupUsersResponse = await client.models.GroupUser.list({
          filter: { groupId: { eq: groupData.id } },
        });

        const enrichedUsers = await Promise.all(
          groupUsersResponse.data.map(async (groupUser) => {
            const userIndexResponse = await client.models.UserIndex.list({
              filter: { userId: { eq: groupUser.userId } },
            });

            const userIndex = userIndexResponse.data[0];
            return {
              userIndexId: userIndex?.id || '',
              userId: groupUser.userId,
              userNickname: userIndex?.userNickname || 'Anonymous',
              photoUrl: userIndex?.photoId || null,
              email: userIndex?.email || 'No Email',
              role: groupUser.role === 'admin' ? ('Admin' as const) : ('Member' as const),
            };
          })
        );

        setGroupUsers(enrichedUsers);
      } catch (error) {
        console.error('Error fetching group details or users:', error);
        setGroupNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    if (groupID) {
      fetchGroupDetails();
    }
  }, [groupID]);

  const handleSaveGroupName = async () => {
    try {
      await client.models.Group.update({
        id: groupDetails?.groupId || '',
        groupname: groupNameInput,
      });
      setGroupDetails((prev) => (prev ? { ...prev, groupname: groupNameInput } : null));
      setIsEditingGroupName(false);
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  };

  const handleRemoveMember = async () => {
    if (!userIdToRemove) return;

    try {
      const groupUserResponse = await client.models.GroupUser.list({
        filter: {
          groupId: { eq: groupDetails?.groupId || '' },
          userId: { eq: userIdToRemove },
        },
      });

      const groupUser = groupUserResponse.data[0];

      if (groupUser) {
        await client.models.GroupUser.delete({ id: groupUser.id });
        setGroupUsers((prevUsers) => prevUsers.filter((user) => user.userId !== userIdToRemove));

        const userIndexResponse = await client.models.UserIndex.list({
          filter: { userId: { eq: userIdToRemove } },
        });
        const userIndex = userIndexResponse.data[0];
        const removedUserNickname = userIndex?.userNickname || 'Unknown User';

        await client.models.GroupMessage.create({
          groupId: groupDetails?.groupId || '',
          type: 'system',
          content: `${removedUserNickname} has been removed from the group`,
          userNickname: 'System',
        });
      } else {
        console.error('GroupUser not found for deletion.');
      }
    } catch (error) {
      console.error('Error removing member from group:', error);
    } finally {
      setUserIdToRemove(null);
    }
  };

  const handleAddMembers = async () => {
    try {
      const groupId = groupDetails?.groupId;
      if (!groupId) return;

      const emailsToProcess = [...memberEmails];
      if (emailInput.trim() !== '') {
        emailsToProcess.push(emailInput.trim());
        setEmailInput('');
      }

      for (const email of emailsToProcess) {
        try {
          const userIndexResponse = await client.models.UserIndex.list({
            filter: { email: { eq: email } },
          });

          if (userIndexResponse.data.length > 0) {
            const user = userIndexResponse.data[0];
            const existingGroupUserResponse = await client.models.GroupUser.list({
              filter: {
                groupId: { eq: groupId },
                userId: { eq: user.userId },
              },
            });

            if (existingGroupUserResponse.data.length === 0) {
              await client.models.GroupUser.create({
                groupId: groupId,
                userId: user.userId,
                email: user.email,
                role: 'member',
                userNickname: user.userNickname,
              });

              setGroupUsers((prevUsers) => [
                ...prevUsers,
                {
                  userIndexId: user.id,
                  userId: user.userId,
                  userNickname: user.userNickname || 'Anonymous',
                  photoUrl: user.photoId || null,
                  email: user.email || 'No Email',
                  role: 'Member',
                },
              ]);

              await client.models.GroupMessage.create({
                groupId: groupId,
                type: 'system',
                content: `${user.userNickname || 'A user'} has been added to the group`,
                userNickname: 'System',
              });
            }
          } else {
            console.warn(`${email} not found in the user index.`);
          }
        } catch (error) {
          console.error(`Error adding member ${email}:`, error);
        }
      }

      setMemberEmails([]);
      setEmailInput('');
      setShowAddMemberPopup(false);
    } catch (error) {
      console.error('Error adding members:', error);
    }
  };

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

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (groupNotFound) {
    return (
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-bold text-red-600">Group Does Not Exist</h1>
            <p>The group you are trying to access does not exist or may have been deleted.</p>
            <Link to="/" className="btn btn-primary mt-4">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white relative">
      {/* Back Arrow Icon */}
      <button
        onClick={handleBack}
        className="absolute top-4 left-4 p-2 text-black-600 hover:text-red-800"
        aria-label="Go Back"
      >
        <FaArrowLeft size={24} />
      </button>
      <div className="hero min-h-screen bg-base-200">
        <div className="hero-content flex flex-col items-center">
          <div className="text-center max-w-md">
            <h1 className="text-3xl font-bold">
              {isEditingGroupName ? (
                <div className="flex items-center">
                  <input
                    type="text"
                    value={groupNameInput}
                    onChange={(e) => setGroupNameInput(e.target.value)}
                    className="input input-bordered w-full max-w-xs"
                  />
                  <button onClick={handleSaveGroupName} className="btn btn-secondary btn-sm ml-2">
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditingGroupName(false)}
                    className="btn btn-secondary btn-sm ml-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  {groupDetails?.groupname}
                  {currentUserId === groupDetails?.adminId && (
                    <button onClick={() => setIsEditingGroupName(true)} className="ml-2">
                      <FaPen size={14} />
                    </button>
                  )}
                </>
              )}
            </h1>
            <p className="py-2">Status: {groupDetails?.chatstatus}</p>
          </div>
          {currentUserId === groupDetails?.adminId && (
            <button
              onClick={() => setShowAddMemberPopup(true)}
              className="btn btn-primary mt-4 flex items-center"
            >
              <FaPlus className="mr-2" /> Add Members
            </button>
          )}
          <div className="w-full mt-6">
            <h2 className="text-2xl font-bold mb-4">Group Members</h2>
            <div className="flex flex-wrap gap-4 rounded-full">
              {groupUsers.map((user) => (
                <div key={user.userIndexId} className="card w-64 bg-white shadow-md p-4 relative">
                  <div className="avatar w-16 h-16 mask mask-squircle mb-4 mx-auto">
                    {user.photoUrl ? (
                      <StorageImage
                        path={user.photoUrl}
                        alt="Profile Picture"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img src="/monkey.png" alt="Default profile picture" />
                    )}
                  </div>
                  <div className="text-center">
                    <Link to={`/profile/${user.userIndexId}`} className="text-lg font-semibold text-blue-600">
                      {user.userNickname}
                    </Link>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-sm font-medium">{user.role}</p>
                    {currentUserId === groupDetails?.adminId && user.userId !== groupDetails?.adminId && (
                      <button
                        onClick={() => setUserIdToRemove(user.userId)}
                        className="absolute top-2 right-2 text-red-600"
                      >
                        <FaTimes />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {userIdToRemove && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white p-4 rounded shadow-md">
              <p>Are you sure you want to remove this member from the group?</p>
              <div className="flex justify-end mt-4">
                <button className="btn btn-danger mr-2" onClick={handleRemoveMember}>
                  Yes, Remove
                </button>
                <button className="btn btn-secondary" onClick={() => setUserIdToRemove(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddMemberPopup && (
          <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow-md">
              <h2 className="text-xl font-bold mb-4">Add Members</h2>
              <input
                className="input input-md input-primary mr-2 mt-2 w-full"
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
              <div className="flex justify-end mt-4">
                <button className="btn btn-primary mr-2" onClick={handleAddMembers}>
                  Add Members
                </button>
                <button className="btn btn-secondary" onClick={() => setShowAddMemberPopup(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetails;
