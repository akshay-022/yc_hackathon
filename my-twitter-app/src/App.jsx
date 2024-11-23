import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';

function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/home');
  };

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Mirror</h1>
          <p className="text-base text-gray-600 mt-2">Your real online self.</p>
        </div>

        {isSignUp ? (
          <SignUp onAuthSuccess={handleAuthSuccess} />
        ) : (
          <SignIn onAuthSuccess={handleAuthSuccess} onSwitchToSignUp={toggleAuthMode} />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={toggleAuthMode}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
