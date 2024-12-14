import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FaPen, FaArrowLeft } from 'react-icons/fa';

const client = generateClient<Schema>();

const ProfilePage = () => {
  const { userIndexId } = useParams<{ userIndexId: string }>();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<Schema['UserIndex']['type'] | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<'Owner' | 'Lawyer' | 'User' | 'VIP' | null>(null);
  const [isSelf, setIsSelf] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [newBio, setNewBio] = useState('');
  const [isEditingRole, setIsEditingRole] = useState(false);
  const [newRole, setNewRole] = useState<'Owner' | 'Lawyer' | 'User' | 'VIP' | ''>('');
  const [isEditingLockedBio, setIsEditingLockedBio] = useState(false);
  const [newLockedBio, setNewLockedBio] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userIndexId) {
        setErrorMessage('Invalid profile ID');
        return;
      }

      try {
        const userIndexResponse = await client.models.UserIndex.get({ id: userIndexId });
        if (userIndexResponse.data) {
          setProfileData(userIndexResponse.data);

          const session = await fetchAuthSession();
          const currentUserId = session.tokens?.idToken?.payload.sub;

          if (currentUserId) {
            const currentUserIndexResponse = await client.models.UserIndex.list({
              filter: { userId: { eq: currentUserId } },
            });

            if (currentUserIndexResponse.data.length > 0) {
              const currentUserData = currentUserIndexResponse.data[0];
              setCurrentUserRole(currentUserData.RedPill || null);
              setIsSelf(currentUserId === userIndexResponse.data.userId);
            }
          }
        } else {
          setErrorMessage('Profile not found');
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        setErrorMessage('Error fetching profile data');
      }
    };

    fetchProfileData();
  }, [userIndexId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (file: File) => {
    if (!profileData) return;

    try {
      const uploadedItem = await uploadData({
        data: file,
        path: `chat-pics/${file.name}`,
      }).result;

      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        photoId: uploadedItem.path,
      });

      const updatedProfileResponse = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileResponse.data);
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMessage("Can't use that image");
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
    }
  };

  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleNicknameEdit = () => {
    setIsEditingNickname(true);
    setNewNickname(profileData?.userNickname || '');
  };

  const handleNicknameSave = async () => {
    if (!profileData) return;

    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        userNickname: newNickname,
      });

          
      const groupUserResponse = await client.models.GroupUser.list({
        filter: { userId: { eq: profileData.userId } },
      });

      for (const groupUser of groupUserResponse.data) {
        await client.models.GroupUser.update({
          id: groupUser.id,
          userNickname: newNickname,
        });
      }

      const updatedProfileResponse = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileResponse.data);

      setIsEditingNickname(false);
      window.location.reload();
    } catch (error) {
      console.error('Error updating nickname:', error);
      setErrorMessage('Error updating nickname');
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
    }
  };

  const handleBioEdit = () => {
    setIsEditingBio(true);
    setNewBio(profileData?.bio || '');
  };

  const handleBioSave = async () => {
    if (!profileData) return;

    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        bio: newBio,
      });

      const updatedProfileResponse = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileResponse.data);

      setIsEditingBio(false);
    } catch (error) {
      console.error('Error updating bio:', error);
      setErrorMessage('Error updating bio');
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
    }
  };

  const handleRoleEdit = () => {
    setIsEditingRole(true);
    setNewRole(profileData?.RedPill || '');
  };

  const handleRoleSave = async () => {
    if (!profileData) return;

    if (!newRole) {
      setErrorMessage('Please select a valid role.');
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
      return;
    }

    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        RedPill: newRole,
      });

      const updatedProfileResponse = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileResponse.data);

      setIsEditingRole(false);
    } catch (error) {
      console.error('Error updating role:', error);
      setErrorMessage('Error updating role');
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
    }
  };

  const handleLockedBioEdit = () => {
    setIsEditingLockedBio(true);
    setNewLockedBio(profileData?.lockedbio || '');
  };

  const handleLockedBioSave = async () => {
    if (!profileData) return;

    try {
      await client.models.UserIndex.update({
        id: profileData.id,
        userId: profileData.userId,
        email: profileData.email,
        lockedbio: newLockedBio,
      });

      const updatedProfileResponse = await client.models.UserIndex.get({ id: profileData.id });
      setProfileData(updatedProfileResponse.data);

      setIsEditingLockedBio(false);
    } catch (error) {
      console.error('Error updating locked bio:', error);
      setErrorMessage('Error updating locked bio');
      setTimeout(() => {
        setErrorMessage('');
      }, 3777);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

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

      {errorMessage && (
        <div className="error text-red-600 mb-4">
          {errorMessage}
        </div>
      )}

      {profileData ? (
        <div className="w-full max-w-md p-6 space-y-4">
          <div className="relative flex justify-center">
            <div className="relative avatar w-16 h-16 mask mask-squircle mb-4 mx-auto">
              {profileData.photoId ? (
                <StorageImage
                  path={profileData.photoId}
                  alt="Profile Picture"
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src="/monkey.png" alt="Profile" className="w-full h-full object-cover" />
              )}
            </div>
            {(isSelf || currentUserRole === 'Owner') && (
              <button
                className="absolute bottom-1 right-32 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
                onClick={openFileInput}
                aria-label="Edit Profile Picture"
              >
                <FaPen />
              </button>
            )}
            {(isSelf || currentUserRole === 'Owner') && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
                accept="image/*"
              />
            )}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center">
              {isEditingNickname ? (
                <>
                  <input
                    type="text"
                    value={newNickname}
                    onChange={(e) => setNewNickname(e.target.value)}
                    className="border p-2"
                  />
                  <div className="flex items-center justify-center mt-2">
                    <button
                      onClick={handleNicknameSave}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingNickname(false);
                        setNewNickname(profileData?.userNickname || '');
                      }}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-bold">{profileData.userNickname}</h2>
                  {(isSelf || currentUserRole === 'Owner') && (
                    <button
                      onClick={handleNicknameEdit}
                      className="ml-2 text-blue-600"
                      aria-label="Edit Nickname"
                    >
                      <FaPen />
                    </button>
                  )}
                </>
              )}
            </div>
            <p className="text-gray-600">{profileData.email}</p>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-center">
              {isEditingBio ? (
                <>
                  <textarea
                    value={newBio}
                    onChange={(e) => setNewBio(e.target.value)}
                    className="border p-2 w-full"
                    rows={4}
                  />
                  <div className="flex items-center justify-center mt-2">
                    <button
                      onClick={handleBioSave}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingBio(false);
                        setNewBio(profileData?.bio || '');
                      }}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {profileData.bio ? (
                    <p className="text-gray-800">{profileData.bio}</p>
                  ) : (
                    <p className="text-gray-500 italic">No bio available.</p>
                  )}
                  {(isSelf || currentUserRole === 'Owner') && (
                    <button
                      onClick={handleBioEdit}
                      className="ml-2 text-blue-600"
                      aria-label="Edit Bio"
                    >
                      <FaPen />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Locked Bio Section */}
          <div className="mt-4">
            <div className="flex items-center justify-center">
              {isEditingLockedBio ? (
                <>
                  <textarea
                    value={newLockedBio}
                    onChange={(e) => setNewLockedBio(e.target.value)}
                    className="border p-2 w-full"
                    rows={4}
                  />
                  <div className="flex items-center justify-center mt-2">
                    <button
                      onClick={handleLockedBioSave}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setIsEditingLockedBio(false);
                        setNewLockedBio(profileData?.lockedbio || '');
                      }}
                      className="btn btn-secondary btn-sm ml-2"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {profileData.lockedbio ? (
                    <p className="text-gray-800 font-bold">{profileData.lockedbio}</p>
                  ) : (
                    <p className="text-gray-500 italic">No locked bio available.</p>
                  )}
                  {currentUserRole === 'Owner' && (
                    <button
                      onClick={handleLockedBioEdit}
                      className="ml-2 text-blue-600"
                      aria-label="Edit Locked Bio"
                    >
                      <FaPen />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Role Section */}
          <div className="mt-4">
            <div className="flex items-center justify-center">
              <p className="text-gray-600">Role: {profileData.RedPill}</p>
              {currentUserRole === 'Owner' && (
                <button
                  onClick={handleRoleEdit}
                  className="ml-2 text-blue-600"
                  aria-label="Edit Role"
                >
                  <FaPen />
                </button>
              )}
            </div>
            {isEditingRole && (
              <>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'Owner' | 'Lawyer' | 'User' | 'VIP')}
                  className="border p-2 w-full mt-2"
                >
                  <option value="">Select Role</option>
                  <option value="Owner">Owner</option>
                  <option value="Lawyer">Lawyer</option>
                  <option value="User">User</option>
                  <option value="VIP">VIP</option>
                </select>
                <div className="flex items-center justify-center mt-2">
                  <button
                    onClick={handleRoleSave}
                    className="btn btn-secondary btn-sm ml-2"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingRole(false);
                      setNewRole(profileData.RedPill || '');
                    }}
                    className="btn btn-secondary btn-sm ml-2"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        !errorMessage && (
          <div className="flex justify-center items-center h-screen">
            <h1 className="text-2xl">Loading...</h1>
          </div>
        )
      )}
    </div>
  );
};

export default ProfilePage;
