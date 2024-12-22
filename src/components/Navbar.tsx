import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { generateClient } from 'aws-amplify/api';
import { FaUser } from 'react-icons/fa';
import { Schema } from '../../amplify/data/resource';



const client = generateClient<Schema>();

interface NavbarProps {
  user: any;
  signOut: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, signOut }) => {
  const [userIndexId, setUserIndexId] = useState('');
  const [userNickname, setUserNickname] = useState('');

  useEffect(() => {
    const fetchUserIndexData = async () => {
      if (user && user.username) {
        try {
          const userIndexResponse = await client.models.UserIndex.list({
            filter: { userId: { eq: user.username } },
          });
          if (userIndexResponse.data.length > 0) {
            const userIndex = userIndexResponse.data[0];
            setUserIndexId(userIndex.id);
            setUserNickname(userIndex.userNickname || '');
          }
        } catch (error) {
          console.error('Error fetching UserIndex:', error);
        }
      }
    };
    fetchUserIndexData();
  }, [user]);

  
  return (
    <div className="navbar bg-primary text-primary-content justify-center">
      <div className="">
      <Link
        to="/"
        className="btn btn-ghost text-xl"
        style={{
          fontWeight: 'bold',
          textDecoration: 'line-through',
          textDecorationThickness: '2px',
        }}
      >
        Redacted
      </Link>
      </div>
      <div className="flex-1">
        <p className="absolute left-1/2 transform -translate-x-1/2">
          Welcome {userNickname}
        </p>
      </div>
      <div>
        <ul className="menu menu-horizontal px-1">
          {user && (
            <>
              <li>
                <Link to={`/profile/${userIndexId}`}>
                  <FaUser className="text-xl" />
                </Link>
              </li>
              <li>
              <button onClick={() => {signOut(); setUserNickname(''); }}>
                Sign Out</button>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Navbar;
