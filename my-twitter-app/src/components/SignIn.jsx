import { useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import LoginDesign from './LoginDesign'; 

function SignIn({ onAuthSuccess, onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get returnTo from location state, default to /home
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${returnTo}`,
          scopes: 'tweet.read users.read email offline_access', // Added offline_access for refresh token
        }
      });
      
      if (error) throw error;
    } catch (error) {
      console.error('OAuth error:', error);
      setAuthError(error.message);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-black-primary">

      {/* Left side - Mirror AI Design */}
      <LoginDesign />

      {/* Right side - Auth Form */}
      <div className="w-[40%] min-w-[500px] bg-black-secondary min-h-screen flex items-center justify-center p-12 border-l border-gray-800">
        <div className="w-full max-w-[440px] space-y-8">
          
          
          <h1 className="text-2xl font-bold text-center mb-6 text-white">Login to Mirror</h1>
          {message && (
            <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded text-blue-200">
              {message}
            </div>
          )}
          <div className="space-y-4">
            {/* OAuth Buttons */}
            <button 
              onClick={() => handleOAuthSignIn('twitter')}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
              Continue with Twitter
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-black-secondary text-gray-400">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              onClick={handleSignIn}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300"
            >
              Sign In
            </button>

            <div className="mt-6 text-center text-gray-400">
              Don't have an account?{' '}
              <button
                onClick={onSwitchToSignUp}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign up
              </button>
            </div>
            
            {authError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
                {authError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignIn; 