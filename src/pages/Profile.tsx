import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
//import { useAuthenticator } from '@aws-amplify/ui-react';
import { uploadData } from 'aws-amplify/storage';
import { StorageImage } from '@aws-amplify/ui-react-storage';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FaPen } from 'react-icons/fa'; // Pen icon for editing

const client = generateClient<Schema>();

const ProfilePage = () => {
  //const { user } = useAuthenticator((context) => [context.user]);
  const { userIndexId } = useParams<{ userIndexId: string }>(); // Get the UserIndex.id from the URL
  const [profileData, setProfileData] = useState<Schema['UserIndex']['type'] | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch the profile data
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

          // Fetch current user's ID
          const session = await fetchAuthSession();
          const currentUserId = session.tokens?.idToken?.payload.sub;

          if (currentUserId && userIndexResponse.data.userId === currentUserId) {
            setIsOwner(true);
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

  // Handle file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      handleUpload(selectedFile);
    }
  };

  // Handle image upload
  const handleUpload = async (file: File) => {
    try {
      const uploadedItem = await uploadData({
        data: file,
        path: `chat-pics/${file.name}`,
      }).result;

      // Update UserIndex with new photoId
      if (profileData) {
        await client.models.UserIndex.update({
          id: profileData.id,
          photoId: uploadedItem.path, // Use 'photoId' instead of 'photoID'
        });

        // Update profileData state
        setProfileData({ ...profileData, photoId: uploadedItem.path });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      setErrorMessage("Can't use that image");
      // Keep photoId as null
    }
  };

  // Open file input dialog
  const openFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-white">
      {errorMessage && <div className="error text-red-600">{errorMessage}</div>}

      {profileData ? (
        <div className="w-full max-w-md p-6 space-y-4">
          <div className="relative">
            {profileData.photoId ? (
              <StorageImage
                path={profileData.photoId}
                alt="Profile Picture"
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <img src="/pfp.webp" alt="Profile" className="w-32 h-32 rounded-full object-cover" />
            )}
            {isOwner && (
              <button
                className="absolute bottom-0 right-0 p-2 bg-gray-200 rounded-full hover:bg-gray-300"
                onClick={openFileInput}
              >
                <FaPen />
              </button>
            )}
            {isOwner && (
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            )}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{profileData.userNickname}</h2>
            <p className="text-gray-600">{profileData.email}</p>
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
