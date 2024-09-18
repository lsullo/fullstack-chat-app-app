import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const GroupsPage = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [fetchedUserId, setFetchedUserId] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<Schema['Group']['type'][]>([]);
  const [isLoading, setIsLoading] = useState(true);  // Loading state
  const [groupAdded, setGroupAdded] = useState(false);  // New state to track if user was added to Group "1"
  const navigate = useNavigate();
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user) {
      fetchAuthSession().then((session) => {
        setFetchedUserId(session.tokens?.idToken?.payload.sub as string);
      });
    } else {
      setFetchedUserId('');
    }
  }, [user]);

  useEffect(() => {
    const checkAndAddUserToGroupOne = async () => {
      if (fetchedUserId && client.models.GroupUser && client.models.Group) {
        try {
          // Fetch the Group "1" by name
          const groupResponse = await client.models.Group.list({
            filter: { groupname: { eq: '1' } },
          });

          if (groupResponse.data.length > 0) {
            const groupId = groupResponse.data[0].id;

            // Check if the user is already in the group "1"
            const groupUserResponse = await client.models.GroupUser.list({
              filter: {
                groupId: { eq: groupId },
                userId: { eq: fetchedUserId },
              },
            });

            // If user is not in the group, add them as a member
            if (groupUserResponse.data.length === 0) {
              await client.models.GroupUser.create({
                groupId: groupId,
                userId: fetchedUserId,
                role: 'member',
              });
              console.log(`User ${fetchedUserId} added to Group "1" as a member`);
              setGroupAdded(true);  // Set this to true to refetch the groups
            }
          } else {
            console.warn('Group "1" not found');
          }
        } catch (error) {
          console.error('Error checking or adding user to Group "1":', error);
        }
      }
    };

    if (fetchedUserId) {
      checkAndAddUserToGroupOne();
    }
  }, [fetchedUserId, client.models.GroupUser, client.models.Group]);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (fetchedUserId && client.models.GroupUser) {
        setIsLoading(true);  // Start loading
        try {
          const groupUserResponse = await client.models.GroupUser.list({
            filter: { userId: { eq: fetchedUserId } },
          });
          const groupIds = groupUserResponse.data.map((groupUser) => groupUser.groupId);
          if (groupIds.length > 0) {
            const groupResponses = await Promise.all(
              groupIds.map((groupId) =>
                client.models.Group.get({ id: groupId })
              )
            );
            const userGroups = groupResponses.map((res) => res.data as Schema['Group']['type']);
            setGroups(userGroups);
          }
        } catch (error) {
          console.error('Error fetching groups:', error);
        } finally {
          setIsLoading(false);  // End loading
        }
      }
    };

    fetchUserGroups();
  }, [fetchedUserId, groupAdded]);  // Refetch groups if the user was added to group "1"

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
          role: 'admin',
        });
        if (groupUserResponse) setGroups([...groups, createdGroup] as Schema['Group']['type'][]);
        navigate(`/groups/${createdGroup.groupUrlName}`);
      } else {
        console.error('Error creating group:', createdGroup);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  return (
    <>
      <h1 className="text-3xl text-center mt-12">Group Chat Rooms</h1>
      {isLoading ? (
        <div className="text-center">Loading...</div> // Loading indicator
      ) : (
        <div className="my-8 w-full">
          <div className="flex flex-col items-center">
            <form onSubmit={handleCreateGroupSubmit}>
              <input
                className="input input-md input-primary mr-2"
                placeholder="add user to group"
                value={groupName}
                required
                onChange={(e) => {
                  setGroupName(e.target.value);
                }}
              />
            </form>
          </div>
          <div className="flex flex-col items-center">
            <form onSubmit={handleCreateGroupSubmit}>
              <input
                className="input input-md input-primary mr-2"
                placeholder="my cool group name"
                value={groupName}
                required
                onChange={(e) => {
                  setGroupName(e.target.value);
                }}
              />
              <div className="flex flex-col items-center">
                <button type="submit" className="btn btn-secondary">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <section>
        {groups.filter(group => group !== null).map((group) => (
          <article
            key={group.id}
            className="bg-accent rounded flex flex-col max-w-screen-md mx-auto p-4"
          >
            <Link
              className="text-2xl text-primary-content"
              to={`/groups/${group.groupUrlName}`}
            >
              <div className="h-24 flex justify-center items-center">
                {group.groupname}
              </div>
            </Link>
          </article>
        ))}
      </section>
    </>
  );
};

export default GroupsPage;
