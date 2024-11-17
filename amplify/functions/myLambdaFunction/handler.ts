import { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
//import outputs from '../../../amplify_outputs.json'; // Ensure this points to your actual Amplify configuration file
import { Schema } from '../../data/resource';

//Amplify.configure(outputs); 
export const handler: Handler = async (event, context) => {
  try {
    const groupId = '22084a9d-05f2-4752-8a11-b43c33736472';
    const client = generateClient<Schema>();

    if (groupId) {
      await client.models.GroupMessage.create({
        groupId: groupId,
        type: 'system',
        content: `ACP ACTIVATED ANTI_GAY ON`,
        userNickname: 'LTM',
      });
    }

    return {
      statusCode: 200,
      body: 'Hello, World!',
    };
  } catch (error) {
    console.error('Error:', error);
  }
};
