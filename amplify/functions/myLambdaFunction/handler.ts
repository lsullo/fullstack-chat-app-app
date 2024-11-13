import Stripe from 'stripe';

const stripe = new Stripe('YOUR_STRIPE_SECRET_KEY', {
  apiVersion: '2024-10-28.acacia',
});

export const handler = async (event: any) => {
  const { sessionId } = event;  // Ensure sessionId is part of the event

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: session.id,
        payment_status: session.payment_status,
        amount_total: session.amount_total,
      }),
    };
  } catch (error) {
    console.error('Error fetching session details', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error fetching session details' }),
    };
  }
};
