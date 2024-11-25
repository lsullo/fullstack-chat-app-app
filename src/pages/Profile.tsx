import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';
import { FaPen } from 'react-icons/fa';

const client = generateClient<Schema>();

const Profile = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    const checkOwnershipAndFetchPhoto = async () => {
      try {
        if (user) {
          const session = await fetchAuthSession();
          const userId = session.tokens?.idToken?.payload.sub;

          if (userId) {
            const userIndexResponse = await client.models.UserIndex.list({
              filter: { userId: { eq: userId } },
            });

            if (userIndexResponse.data.length > 0) {
              const userIndexEntry = userIndexResponse.data[0];

              // Parse current URL to determine profile user
              const currentUrl = window.location.href;
              const urlUserId = new URL(currentUrl).pathname.split('/').pop();

              // Set ownership state
              if (urlUserId === userIndexEntry.userId) {
                setIsOwner(true);
              } else {
                setIsOwner(false);
              }

              // Fetch profile data
              if (userIndexEntry.photoId) {
                const url = `/path/to/image/${userIndexEntry.photoId}`;
                setPhotoUrl(url);
              } else {
                setPhotoUrl(null);
              }

              setUsername(userIndexEntry.userNickname || 'No username available');
            }
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
                <img src={photoUrl} alt="Profile" />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Photo
                </div>
              )}
            </div>
            {isOwner && (
              <button
                className="absolute bottom-2 right-2 btn btn-sm btn-circle btn-primary"
                onClick={() => console.log('Open file picker or edit logic')}
              >
                <FaPen />
              </button>
            )}
          </div>
          {isOwner ? (
            <div className="mt-4">
              <button className="btn btn-primary" onClick={() => console.log('Edit profile logic')}>
                Edit Profile
              </button>
              <button
                className="btn btn-secondary ml-2"
                onClick={() => console.log('Change photo logic')}
              >
                Change Photo
              </button>
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
