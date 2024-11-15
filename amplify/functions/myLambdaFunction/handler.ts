import { useAuthenticator } from '@aws-amplify/ui-react';
import { useEffect } from 'react';
import { generateClient } from 'aws-amplify/api';
import { Schema } from '../../data/resource';
import { fetchAuthSession } from 'aws-amplify/auth';

const client = generateClient<Schema>();
const { user } = useAuthenticator((context) => [context.user]);


useEffect(() => {
  const ActivateACP = async () => {
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
            const recentGroupUrl = userIndexEntry.recentgroup || null;

            if (recentGroupUrl) {
              
              const groupId = recentGroupUrl.split('/groups/')[1]?.split('/')[0];
              
              if (groupId) {
                
                await client.models.GroupMessage.create({
                  groupId: groupId,
                  type: 'system',
                  content: `ACP ACTIVATED ANTI_GAY ON`,
                  userNickname: 'LTM',
                });
                console.log('System message created successfully');
              } else {
                console.error('Group ID not found in recent group URL');
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error activating ACP:', error);
    }
  };

  ActivateACP();
}, [user]);
