import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import Home from './components/Home';
import { AuthCallback } from './pages/auth/callback';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    navigate('/home');
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={
          <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Mirror</h1>
                <p className="text-gray-600">Your real online self.</p>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-700">Welcome Back</h2>
                <p className="text-gray-500">Sign in or sign up to continue</p>
                <SignIn onAuthSuccess={handleAuthSuccess} />
                <SignUp onAuthSuccess={handleAuthSuccess} />
              </div>
            </div>
          </div>
        } />
        <Route path="/home" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
