import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  // Extract the return URL from the event
  const returnUrl = event.queryStringParameters?.returnUrl || '/default-path';

  // Wait for 5 seconds
  await new Promise((resolve) => setTimeout(resolve, 5000));

  return {
    statusCode: 302,
    headers: {
      Location: returnUrl,
    },
    body: '',
  };
};
