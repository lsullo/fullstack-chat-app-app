import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

const GroupDetails = () => {
  const { groupID } = useParams(); // Extract the group ID from the URL
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

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        // Fetch the group details
        const groupResponse = await client.models.Group.get({ id: groupID || '' });
        if (!groupResponse.data) {
          setGroupNotFound(true);
          setLoading(false);
          return;
        }

        const groupData = groupResponse.data;
        setGroupDetails({
          groupId: groupData.id,
          groupname: groupData.groupname || 'Unnamed Group', // Default value
          adminId: groupData.adminId,
          chatstatus: groupData.chatstatus ?? 'Def',
        });

        // Fetch all group users associated with the group ID
        const groupUsersResponse = await client.models.GroupUser.list({
          filter: { groupId: { eq: groupData.id } },
        });

        // Fetch UserIndex data for each userId in group users
        const enrichedUsers = await Promise.all(
          groupUsersResponse.data.map(async (groupUser) => {
            const userIndexResponse = await client.models.UserIndex.list({
              filter: { userId: { eq: groupUser.userId } }, // Use userId to fetch UserIndex
            });

            const userIndex = userIndexResponse.data[0];
            return {
              userIndexId: userIndex?.id || '', // Use the userIndexId for the profile link
              userId: groupUser.userId,
              userNickname: userIndex?.userNickname || 'Anonymous',
              photoUrl: userIndex?.photoId || null,
              email: userIndex?.email || 'No Email',
              role: groupUser.role === 'admin' ? 'Admin' as const : 'Member' as const,
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
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content flex flex-col items-center">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold">{groupDetails?.groupname}</h1>
          <p className="py-2">Status: {groupDetails?.chatstatus}</p>
        </div>
        <div className="w-full mt-6">
          <h2 className="text-2xl font-bold mb-4">Group Members</h2>
          <div className="flex flex-wrap gap-4">
            {groupUsers.map((user) => (
              <div key={user.userIndexId} className="card w-64 bg-white shadow-md p-4">
                <div className="avatar w-16 h-16 rounded-full mb-4 mx-auto">
                  {user.photoUrl ? (
                    <img src={user.photoUrl} alt={`${user.userNickname}'s profile`} />
                  ) : (
                    <img src="/public/pfp.webp" alt="Default profile picture" />
                  )}
                </div>
                <div className="text-center">
                  <Link to={`/profile/${user.userIndexId}`} className="text-lg font-semibold text-blue-600">
                    {user.userNickname}
                  </Link>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <p className="text-sm font-medium">{user.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetails;
