import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState, useRef } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FaPen } from 'react-icons/fa';
import { uploadData } from 'aws-amplify/storage';
import { StorageImage } from '@aws-amplify/ui-react-storage';

const client = generateClient<Schema>();

const Profile = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkOwnershipAndFetchPhoto = async () => {
      try {
        if (user) {
          const currentUrl = window.location.href;
          const urlUserIndexId = new URL(currentUrl).pathname.split('/').pop();

          if (urlUserIndexId) {
            // Fetch UserIndex entry by URL ID
            const userIndexResponse = await client.models.UserIndex.list({
              filter: { id: { eq: urlUserIndexId } },
            });

            if (userIndexResponse.data && userIndexResponse.data.length > 0) {
              const userIndexEntry = userIndexResponse.data[0];

              // Fetch current user session for ID comparison
              const session = await fetchAuthSession();
              const userId = session.tokens?.idToken?.payload.sub;

              // Check ownership
              setIsOwner(userId === userIndexEntry.userId);

              // Fetch profile photo if available
              if (userIndexEntry.photoId) {
                const url = `/path/to/image/${userIndexEntry.photoId}`;
                setPhotoUrl(url);
              } else {
                setPhotoUrl(null);
              }

              // Set username
              setUsername(userIndexEntry.userNickname || 'No username available');
            } else {
              console.error(`No UserIndex entry found for ID: ${urlUserIndexId}`);
            }
          } else {
            console.error('Invalid URL: Could not extract UserIndex ID.');
          }
        }
      } catch (error) {
        console.error('Error fetching profile data or photo:', error);
      } finally {
        setLoading(false);
      }
    };

    checkOwnershipAndFetchPhoto();
  }, [user]);

  const handleFilePickerClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Upload the file and await the result
        const uploadedItem = await uploadData({
          data: file,
          path: `profile-pics/${file.name}`,
          options: { bucket: 'profilepics' }, // Specify the target bucket
        }).result;
  
        // Access the path from the resolved value
        const photoId = uploadedItem.path;
  
        // Update UserIndex with new photoId
        const currentUrl = window.location.href;
        const urlUserIndexId = new URL(currentUrl).pathname.split('/').pop();
  
        if (urlUserIndexId) {
          await client.models.UserIndex.update({
            id: urlUserIndexId,
            photoId, // Directly update the `photoId`
          });
  
          // Update the UI with the new photo URL
          setPhotoUrl(`/path/to/image/${photoId}`);
        }
      } catch (error) {
        console.error('Error uploading file or updating user index:', error);
      }
    }
  };
  

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">
            {isOwner ? 'Your Profile' : `${username}'s Profile`}
          </h1>
          <p className="py-6">{username}</p>
          <div className="avatar relative">
            <div className="w-24 mask mask-squircle">
              {photoUrl ? (
          <StorageImage
            path={photoUrl}
            alt="Profile Picture"
            className="w-full h-full object-cover"
          />
              ) : (
                <img src="/public/pfp.webp" alt="Default profile picture" />
              )}
            </div>
            {isOwner && (
              <>
                <button
                  className="absolute bottom-2 right-2 btn btn-sm btn-circle btn-primary"
                  onClick={handleFilePickerClick}
                >
                  <FaPen />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>
          {isOwner ? (
            <div className="mt-4">
              <button className="btn btn-primary">Edit Profile</button>
            </div>
          ) : (
            <p className="mt-4 text-gray-600">You are viewing this profile as a guest.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
