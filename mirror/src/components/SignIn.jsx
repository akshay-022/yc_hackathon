import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';

function SignIn({ onAuthSuccess, onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  const returnTo = location.state?.returnTo || '/home';
  const message = location.state?.message;

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      navigate(returnTo);
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleOAuthSignIn = async (provider) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${returnTo}`
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('OAuth error:', error);
      setAuthError(error.message);
    }
  };

  return (
    <div className="max-w-md w-full p-6 bg-black-secondary rounded-lg">
      <h1 className="text-2xl font-bold text-center mb-6 text-gray-light">Login to Mirror</h1>
      {message && (
        <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200">
          {message}
        </div>
      )}
      <div className="space-y-4">
        <button 
          onClick={() => handleOAuthSignIn('twitter')}
          className="w-full bg-blue-primary text-white py-2 px-4 rounded hover:bg-blue-secondary transition duration-200 flex items-center justify-center gap-2"
        >
          <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
          Continue with Twitter
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-black-secondary text-gray-400">Or continue with email</span>
          </div>
        </div>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-primary text-white"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-primary text-white"
        />
        <button
          onClick={handleSignIn}
          className="w-full bg-blue-secondary text-white py-2 rounded-md hover:bg-blue-primary transition duration-300"
        >
          Sign In
        </button>
        
        {authError && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
            {authError}
          </div>
        )}
      </div>
    </div>
  );
}

export default SignIn; 