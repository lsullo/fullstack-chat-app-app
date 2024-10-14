import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import RootLayout from './layouts/RootLayout';
import ProtectedLayout from './layouts/ProtectedLayout';
import HomePage from './pages/HomePage';
import GroupsPage from './pages/GroupsPage';
import PrivateMessagePage from './pages/PrivateMessagePage';

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