import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/api';

const client = generateClient<Schema>();

const GroupsPage = () => {
  const [rooms, setRooms] = useState<Schema['Room']['type'][]>([]);
  const [roomName, setRoomName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    client.models.Room.list().then((rooms) => {
      setRooms(rooms.data);
    });
  }, []);

  const handleCreateRoomSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const urlName = roomName.toLowerCase().replace(/\s/g, '-');
    const { data: createdRoom } = await client.models.Room.create({
      name: roomName,
      urlName,
      participants: selectedUsers.join(','),
    });
    setRoomName('');
    setSelectedUsers([]);

    setRooms([...rooms, createdRoom] as Schema['Room']['type'][]);
    navigate(`/rooms/${urlName}`);
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);

    if (e.target.value.trim() === '') {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetch(`/api/search-users?query=${e.target.value}`);
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleAddUser = (user: string) => {
    if (!selectedUsers.includes(user)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleRemoveUser = (user: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u !== user));
  };

  return (
    <>
      <h1 className="text-3xl text-center mt-12">Group Chat Rooms</h1>
      <div className="my-8 w-full">
        <div className="flex flex-col items-center">
          <form onSubmit={handleCreateRoomSubmit}>
            <input
              className="input input-md input-primary mr-2"
              placeholder="Group Room Name"
              value={roomName}
              required
              onChange={(e) => setRoomName(e.target.value)}
            />
            <div className="relative">
              <input
                className="input input-md input-primary mr-2"
                placeholder="Search Users"
                value={searchTerm}
                onChange={handleSearchChange}
              />
              {searchResults.length > 0 && (
                <ul className="absolute bg-white border mt-1 w-full z-10">
                  {searchResults.map((result) => (
                    <li
                      key={result}
                      className="p-2 cursor-pointer hover:bg-gray-200"
                      onClick={() => handleAddUser(result)}
                    >
                      {result}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex flex-wrap mt-2">
              {selectedUsers.map((user) => (
                <div key={user} className="bg-gray-200 p-2 rounded flex items-center m-1">
                  {user}
                  <button
                    type="button"
                    className="ml-2 text-red-500"
                    onClick={() => handleRemoveUser(user)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <button type="submit" className="btn btn-secondary mt-2">
              Create Room
            </button>
          </form>
        </div>
      </div>
      <section>
        {rooms.map((room) => (
          <article
            key={room.id}
            className="bg-accent rounded flex flex-col max-w-screen-md mx-auto p-4"
          >
            <Link
              className="text-2xl text-primary-content"
              to={`/rooms/${room.urlName}`}
            >
              <div className="h-24 flex justify-center items-center">
                {room.name}
              </div>
            </Link>
          </article>
        ))}
      </section>
    </>
  );
};

export default GroupsPage;
