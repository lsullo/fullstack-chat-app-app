import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import RootLayout from './layouts/RootLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import HomePage from './pages/HomePage';
import GroupsPage from './pages/GroupsPage';
import PrivateMessagePage from './pages/PrivateMessagePage';
import PaymentSuccess from './pages/PaymentSuccess';
//import GroupManagement from './pages/GroupManagement';
import ProfilePage from './pages/Profile';
import GroupDetails from './pages/GroupDetails';

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        element: <ProtectedLayout />,
        children: [
          {
            path: 'groups',
            element: <GroupsPage />,
          },
          {
            path: 'groups/:groupID',
            element: <PrivateMessagePage />,
          },
          {
            path: 'groups/create',
            element: <GroupsPage />, 
          },
          {
            path: 'paymentsuccess', 
            element: <PaymentSuccess />,
          },
         // {
           // path: 'GroupManagement', 
          //  element: <GroupManagement />,
          //},
          {
            path: 'groupdetails/:groupID', 
            element: <GroupDetails />,
          },
          {
            path: 'profile/:userIndexId', 
            element: <ProfilePage />,
          },
        ],
      },
    ],
  },
]);

function App() {
  return (
    <Authenticator.Provider>
      <RouterProvider router={router} />
    </Authenticator.Provider>
  );
}

export default App;
