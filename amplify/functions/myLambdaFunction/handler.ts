import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' as any });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  const checkoutSessionId = event.queryStringParameters?.checkout_session_id;

  if (!checkoutSessionId) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow CORS for any origin
      },
      body: JSON.stringify({ error: 'Missing checkout session ID' }),
    };
  }

  try {
    // Fetch the checkout session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow CORS for any origin
      },
      body: JSON.stringify({
        client_reference_id: session.client_reference_id || null,
      }),
    };
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow CORS for any origin
      },
      body: JSON.stringify({ error: 'Failed to retrieve checkout session' }),
    };
  }
};
