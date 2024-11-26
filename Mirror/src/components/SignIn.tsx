import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';

function SignIn({ 
  onAuthSuccess, 
  onSwitchToSignUp, 
  showSuccessMessage,
  onSuccessMessageDismiss 
}: { 
  onAuthSuccess: () => void, 
  onSwitchToSignUp: () => void,
  showSuccessMessage?: boolean,
  onSuccessMessageDismiss?: () => void
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
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
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="max-w-md w-full p-6 bg-black-secondary rounded-lg">
      <h1 className="text-2xl font-bold text-center mb-6 text-white">Login to Mirror</h1>
      
      {showSuccessMessage && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded text-green-200">
          Sign up successful! Please sign in with your new account.
        </div>
      )}
      
      <div className="space-y-4">
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