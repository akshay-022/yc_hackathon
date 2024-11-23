import { useNavigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';

function App() {
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/twitter-login');
  };

  return (
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
  );
}

export default App;
