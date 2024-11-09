import { Link } from 'react-router-dom';
import gifImage from '/chad.gif'; 

const PaymentSuccess = () => {
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
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
