import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const GroupsPage = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [fetchedUserId, setFetchedUserId] = useState<string>('');
  const [groups, setGroups] = useState<Schema['Group']['type'][]>([]);
  const [groupName, setGroupName] = useState('');
  const navigate = useNavigate();
  const client = generateClient<Schema>();
  //const [groupDetails] = useState<{groupId: string}>()
  

  useEffect(() => {
    if (client.models && client.models.Group) {
      client.models.Group.list().then((groupsResponse) => {
        setGroups(groupsResponse.data);
      });
    } else {
      console.error('Error');
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchAuthSession().then((session) => {
        setFetchedUserId(session.tokens?.idToken?.payload.sub as string);
      });
    } else {
      setFetchedUserId('');
    }
  }, [user]);

 // useEffect(() => {
    //client.models.Group.list().then((groupsResponse) => {
      //setGroups(groupsResponse.data);
   // });
 // }, []);

  const handleCreateGroupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const groupUrlName = groupName.toLowerCase().replace(/\s/g, '-');
    try {
      const { data: createdGroup } = await client.models.Group.create({
        //groupId: groupDetails?.groupId || '', // Provide a default value if groupId is undefined
        groupname: groupName,
        groupUrlName,
        adminId: fetchedUserId,
      });
      if (createdGroup) {
        setGroupName('');
        setGroups([...groups, createdGroup] as Schema['Group']['type'][]);
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
      <div className="my-8 w-full">
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
            <button type="submit" className="btn btn-secondary">
              Create Group
            </button>
          </form>
        </div>
      </div>
      <section>
        {groups.map((group) => (
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