import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import AuthCallback from './components/Auth/callback';
import './index.css';
import App from './App';
import Home from './components/Home';
import { BackendProvider } from './BackendContext';
import PublicChat from './components/PublicChat';
import ResetPassword from './components/ResetPassword';

const BACKEND_URL = 'https://tznrpdmwzpuispggvpdk.supabase.co';

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />
  },
  {
    path: '/home',
    element: <Home />
  },
  {
    path: '/auth/callback',
    element: <AuthCallback />
  },
  {
    path: '/chat/:targetUserId',
    element: <PublicChat />
  },
  {
    path: '/reset-password',
    element: <ResetPassword />
  }
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BackendProvider backendUrl={BACKEND_URL}>
      <RouterProvider router={router} />
    </BackendProvider>
  </React.StrictMode>
); 