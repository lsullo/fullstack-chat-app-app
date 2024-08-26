import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import RootLayout from './layouts/RootLayout'
import ProtectedLayout from './layouts/ProtectedLayout'
import HomePage from './pages/HomePage'
import RoomsPage from './pages/RoomsPage'
import MessagePage from './pages/MessagePage'
import GroupsPage from './pages/GroupsPage'
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
            children: [
              {
                path: '',
                element: <GroupsPage />,
              },
              {
                path: ':groupName',
                element: <PrivateMessagePage />,
              },
              {
                path: 'create',
                element: <GroupsPage />, // Assuming you have a component for creating rooms
              },
            ],
          },
          {
            path: 'rooms',
            children: [
              {
                path: '',
                element: <RoomsPage />,
              },
              {
                path: ':roomName',
                element: <MessagePage />,
              },
              {
                path: 'create',
                element: <RoomsPage />, // Assuming you have a component for creating rooms
              },
            ],
          },
        ],
      },
    ],
  },
])

function App() {
  return (
    <Authenticator.Provider>
      <RouterProvider router={router} />
    </Authenticator.Provider>
  )
}

export default App
