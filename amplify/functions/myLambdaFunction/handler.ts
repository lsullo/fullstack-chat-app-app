import type { Handler } from 'aws-lambda';
import { Schema } from '../../data/resource';
import { generateClient } from 'aws-amplify/api';

export const handler: Handler = async (event, context) => {
  const groupId = '22084a9d-05f2-4752-8a11-b43c33736472'
  const client = generateClient<Schema>();

              if (groupId) {
                await client.models.GroupMessage.create({
                  groupId: groupId,
                  type: 'system',
                  content: `ACP ACTIVATED ANTI_GAY ON`,
                  userNickname: 'LTM',
                });
              }
  return 'Hello, World!';
};