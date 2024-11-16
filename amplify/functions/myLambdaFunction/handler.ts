import AWS from 'aws-sdk';

const dynamoDb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event: any) => {
  try {
    console.log('Received event:', JSON.stringify(event, null, 2));

    // Parse the Stripe webhook event
    const stripeEvent = JSON.parse(event.body);

    // Verify it's the correct event type
    if (stripeEvent.type !== 'checkout.session.completed') {
      console.error('Invalid event type:', stripeEvent.type);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Event type not supported' }),
      };
    }

    // Extract metadata from Stripe session
    const session = stripeEvent.data.object;
    const userId = session.metadata?.userId; // Ensure this metadata is passed during Stripe session creation

    if (!userId) {
      console.error('User ID not found in session metadata');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'User ID is required' }),
      };
    }

    // Query UserIndex table for the user's recentgroup
    const userIndexResponse = await dynamoDb
      .query({
        TableName: 'UserIndex', // Replace with your DynamoDB table name
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId,
        },
      })
      .promise();

    if (userIndexResponse.Items && userIndexResponse.Items.length > 0) {
      const userIndexEntry = userIndexResponse.Items[0];
      const recentGroupUrl = userIndexEntry.recentgroup;

      if (recentGroupUrl) {
        // Extract the group ID from the recent group URL
        const groupId = recentGroupUrl.split('/groups/')[1]?.split('/')[0];

        if (groupId) {
          // Add a system message to the GroupMessage table
          await dynamoDb
            .put({
              TableName: 'GroupMessage', // Replace with your DynamoDB table name
              Item: {
                groupId,
                type: 'system',
                content: 'ACP ACTIVATED ANTI_GAY ON',
                userNickname: 'LTM', // Adjust the nickname as necessary
                createdAt: new Date().toISOString(),
              },
            })
            .promise();

          console.log('System message created successfully');
          return {
            statusCode: 200,
            body: JSON.stringify({ message: 'System message created successfully' }),
          };
        } else {
          console.error('Group ID not found in recent group URL');
          return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Group ID not found in recent group URL' }),
          };
        }
      } else {
        console.error('Recent group URL not found for user');
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Recent group URL not found for user' }),
        };
      }
    } else {
      console.error('User not found in UserIndex');
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'User not found in UserIndex' }),
      };
    }
  } catch (error) {
    console.error('Error processing the event:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error', error }),
    };
  }
};