import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect, useState } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../amplify/data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();

const PaymentSuccess = () => {
  const { user } = useAuthenticator((context) => [context.user]);
  const [recentGroupUrl, setRecentGroupUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecentGroupUrl = async () => {
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
              setRecentGroupUrl(userIndexEntry.recentgroup || null);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching recent group URL:', error);
      }
    };

    fetchRecentGroupUrl();
  }, [user]);

  useEffect(() => {
    if (recentGroupUrl) {
      setTimeout(() => {
        window.location.href = recentGroupUrl;
      }, 3777);
    }
  }, [recentGroupUrl]);

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="py-6">Thank you for your payment! You can now access your group chat rooms.</p>
          <p>{recentGroupUrl ? `Redirecting to your recent group: ${recentGroupUrl}` : "Loading your recent group..."}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
