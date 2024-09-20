import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const GroupsPage = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [fetchedUserId, setFetchedUserId] = useState<string>('');
  const [userEmail, setUserEmail] = useState<string>(''); // User's email state
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState<Schema['Group']['type'][]>([]);
  const [isLoading, setIsLoading] = useState(true);  
  const [groupAdded, setGroupAdded] = useState(false);  
  const [memberEmails, setMemberEmails] = useState<string[]>([]); // State to track member emails
  const [emailInput, setEmailInput] = useState(''); // Input for searching and adding user by email
  const navigate = useNavigate();
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user) {
      fetchAuthSession().then((session) => {
        const userId = session.tokens?.idToken?.payload.sub as string;
        const email = session.tokens?.idToken?.payload.email as string;
        setFetchedUserId(userId);
        setUserEmail(email);
      });
    } else {
      setFetchedUserId('');
      setUserEmail('');
    }
  }, [user]);

  useEffect(() => {
    const checkAndAddUserToGroupOne = async () => {
      if (fetchedUserId && client.models.GroupUser && client.models.Group) {
        try {
          const groupResponse = await client.models.Group.list({
            filter: { groupname: { eq: '1' } },
          });

          if (groupResponse.data.length > 0) {
            const groupId = groupResponse.data[0].id;

            const groupUserResponse = await client.models.GroupUser.list({
              filter: {
                groupId: { eq: groupId },
                userId: { eq: fetchedUserId },
              },
            });

            if (groupUserResponse.data.length === 0) {
              await client.models.GroupUser.create({
                groupId: groupId,
                userId: fetchedUserId,
                email: userEmail,
                role: 'member',
              });
              setGroupAdded(true); 
            }
          } else {
            console.warn('Group "1" not found');
          }
        } catch (error) {
          console.error('Error:', error);
        }
      }
    };

    if (fetchedUserId) {
      checkAndAddUserToGroupOne();
    }
  }, [fetchedUserId, client.models.GroupUser, client.models.Group, userEmail]);

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
              groupIds.map((groupId) =>
                client.models.Group.get({ id: groupId })
              )
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

  const handleAddEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && emailInput) {
      e.preventDefault();
      if (!memberEmails.includes(emailInput)) {
        setMemberEmails([...memberEmails, emailInput]);
      }
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((item) => item !== email));
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
        await client.models.GroupUser.create({
          groupId: createdGroup.id,
          userId: fetchedUserId,
          email: userEmail,
          role: 'admin',
        });

        // Add each member email as a group user with 'member' role
        for (const email of memberEmails) {
          // Fetch the userId based on the email address
          const userResponse = await client.models.GroupUser.list({
            filter: { email: { eq: email } },
          });

          // Check if the user exists in the system
          if (userResponse.data.length > 0) {
            const userId = userResponse.data[0].id;

            // Check if the user is already in the group
            const existingUser = await client.models.GroupUser.list({
              filter: { groupId: { eq: createdGroup.id }, userId: { eq: userId } },
            });

            if (existingUser.data.length === 0) {
              await client.models.GroupUser.create({
                groupId: createdGroup.id,
                userId: userId,
                email: email, // Optional field
                role: 'member',
              });
            }
          } else {
            console.warn(`User with email ${email} not found. No GroupUser created.`);
          }
        }

        setGroups([...groups, createdGroup] as Schema['Group']['type'][]);
        setMemberEmails([]); // Clear the selected members after creating the group
        navigate(`/groups/${createdGroup.groupUrlName}`);
      } else {
        console.error('Error:', createdGroup);
      }
    } catch (error) {
      console.error('Error:', error);
    }
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
                placeholder="add user to group"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onKeyDown={handleAddEmail}
              />
              <div className="flex flex-wrap mt-2">
                {memberEmails.map((email) => (
                  <div key={email} className="bg-gray-300 rounded px-2 py-1 mr-2 mb-2 flex items-center">
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      className="ml-1 text-red-500"
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
              <input
                className="input input-md input-primary mr-2 mt-4"
                placeholder="my cool group name"
                value={groupName}
                required
                onChange={(e) => {
                  setGroupName(e.target.value);
                }}
              />
              <div className="flex flex-col items-center mt-2">
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