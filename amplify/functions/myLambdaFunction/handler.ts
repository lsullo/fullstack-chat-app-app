import { APIGatewayProxyHandler } from 'aws-lambda';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-08-16" as any });

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('Event received:', JSON.stringify(event, null, 2));

  const checkoutSessionId = event.queryStringParameters?.checkout_session_id;

  if (!checkoutSessionId) {
    return {
      statusCode: 400,
      body: 'Missing checkout session ID',
    };
  }

  try {
    // Fetch the checkout session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const returnUrl = session.success_url || '/default-path';

    // Wait for 5 seconds
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return {
      statusCode: 302,
      headers: {
        Location: returnUrl,
      },
      body: '',
    };
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return {
      statusCode: 500,
      body: 'Failed to retrieve checkout session',
    };
  }
};

