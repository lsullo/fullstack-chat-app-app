import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';

const client = generateClient<Schema>();

const PaymentSuccess = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [recentGroupUrl, setRecentGroupUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentGroupUrl = async () => {
      if (user?.username) {
        try {
          const userIndexResponse = await client.models.UserIndex.list({
            filter: { userId: { eq: user.username } }, // Assuming userId is stored as username
          });
          
          if (userIndexResponse.data.length > 0) {
            setRecentGroupUrl(userIndexResponse.data[0].recentgroup);
          } else {
            console.warn(`No UserIndex entry found for userId: ${user.username}`);
          }
        } catch (error) {
          console.error('Error fetching recent group URL:', error);
        }
      }
    };

    fetchRecentGroupUrl();
  }, [user]);

  useEffect(() => {
    if (recentGroupUrl) {
      setTimeout(() => {
        window.location.href = recentGroupUrl;
      }, 5000); // Redirect after 5 seconds
    }
  }, [recentGroupUrl]);

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="py-6">Thank you for your payment! You can now access your group chat rooms.</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
