import { APIGatewayProxyHandler } from 'aws-lambda';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));
  // Your custom logic here
  return {
    statusCode: 200,
    body: JSON.stringify('Function executed successfully!'),
  };
};
