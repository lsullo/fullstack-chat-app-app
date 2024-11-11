import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import gifImage from '/chad.gif';

const useQuery = () => {
  return new URLSearchParams(useLocation().search);
};

const PaymentSuccess = () => {
  const query = useQuery();
  const sessionId = query.get('checkout_session_id');
  const [sessionDetails, setSessionDetails] = useState(null);

  useEffect(() => {
    if (sessionId) {
      fetch(`/api/checkout-session/${sessionId}`)
        .then((response) => response.json())
        .then((data) => setSessionDetails(data))
        .catch((error) => console.error('Error fetching session details:', error));
    }
  }, [sessionId]);

  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold">Payment Successful!</h1>
          <p className="py-6">
            Thank you for your payment! You can now access your group chat rooms.
          </p>
          <img src={gifImage} alt="Success" className="mx-auto my-4" />
          <Link to="/groups" className="btn btn-primary" style={{ marginLeft: '10px' }}>
            Go to Group Chats
          </Link>
          {sessionDetails && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold">Session Details:</h2>
              <pre className="text-left bg-gray-100 p-2 rounded">
                {JSON.stringify(sessionDetails, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
