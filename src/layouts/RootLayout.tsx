import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

export default function RootLayout() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const [fetchedUserNickname, setFetchedUserNickname] = useState<string>('');

  useEffect(() => {
    const fetchUserNickname = async () => {
      if (user && user.username) {
        try {
          const userIndexResponse = await client.models.UserIndex.list({
            filter: { userId: { eq: user.username } },
          });
          if (userIndexResponse.data.length > 0) {
            const userNickname = userIndexResponse.data[0].userNickname || '';
            setFetchedUserNickname(userNickname);
          }
        } catch (error) {
          console.error('Error fetching UserIndex:', error);
        }
      } else {
        setFetchedUserNickname('');
      }
    };
    fetchUserNickname();
  }, [user]);

  return (
    <div className="flex flex-col h-screen">
      <header className="header">
        <Navbar user={user} signOut={signOut} />
      </header>
      <main className="flex-1">
        <Outlet context={{ fetchedUserNickname }} />
      </main>
      <Footer />
    </div>
  );
}
