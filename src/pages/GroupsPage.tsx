import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';

const GroupsPage = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [fetchedUserNickname, setFetchedUserNickname] = useState<string>('');
  const [groups, setGroups] = useState<Schema['GroupChat']['type'][]>([]);
  const [groupName, setGroupName] = useState('');
  const navigate = useNavigate();
  const client = generateClient<Schema>();

  useEffect(() => {
    if (user) {
      fetchAuthSession().then((session) => {
        setFetchedUserNickname(session.tokens?.idToken?.payload.nickname as string);
      });
    } else {
      setFetchedUserNickname('');
    }
  }, [user]);

  useEffect(() => {
    client.models.GroupChat.list().then((groups) => {
      setGroups(groups.data);
    });
  }, []);

  const handleCreateGroupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const groupUrlName = groupName.toLowerCase().replace(/\s/g, '-');
    const { data: createdGroup } = await client.models.GroupChat.create({
      groupname: groupName,
      groupUrlName,
      adminId: fetchedUserNickname,
    });
    setGroupName('');

    setGroups([...groups, createdGroup] as Schema['GroupChat']['type'][]);
    if (createdGroup && 'groupUrlName' in createdGroup) {
      navigate(`/groups/${createdGroup.groupUrlName}`);
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