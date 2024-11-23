import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { createBrowserRouter } from 'react-router-dom';
import AuthCallback from './components/Auth/callback';
import './index.css';
import App from './App';
import Home from './components/Home';
import { BackendProvider } from './BackendContext';

const BACKEND_URL = 'http://localhost:8000'; // Set your backend URL here

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
  }
]);

// Create root and render
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BackendProvider backendUrl={BACKEND_URL}>
      <RouterProvider router={router} />
    </BackendProvider>
  </React.StrictMode>
);





