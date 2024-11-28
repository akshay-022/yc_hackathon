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
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const returnTo = location.state?.returnTo || '/home';

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      const { error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (error) throw error;
      navigate(returnTo);
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      setResetSuccess(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      
      setResetSuccess('Check your email for the password reset link');
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md px-4 sm:px-6 py-4 sm:py-6 bg-black-secondary rounded-lg">
      <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-white">
        {isResetMode ? 'Reset Password' : 'Login to Mirror'}
      </h1>
      
      {showSuccessMessage && (
        <div className="mb-4 p-2 sm:p-3 text-sm sm:text-base bg-green-500/20 border border-green-500/30 rounded text-green-200">
          Sign up successful! Please sign in with your new account.
        </div>
      )}

      {resetSuccess && (
        <div className="mb-4 p-2 sm:p-3 text-sm sm:text-base bg-green-500/20 border border-green-500/30 rounded text-green-200">
          {resetSuccess}
        </div>
      )}
      
      <div className="space-y-3 sm:space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
        />
        
        {!isResetMode && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        )}

        <button
          onClick={isResetMode ? handleResetPassword : handleSignIn}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 text-sm sm:text-base rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
        >
          {isLoading 
            ? (isResetMode ? 'Sending...' : 'Signing in...') 
            : (isResetMode ? 'Send Reset Link' : 'Sign In')}
        </button>
        
        <button
          onClick={() => {
            setIsResetMode(!isResetMode);
            setAuthError(null);
            setResetSuccess(null);
          }}
          className="w-full text-blue-400 hover:text-blue-300 text-sm sm:text-base transition duration-300"
        >
          {isResetMode ? 'Back to Sign In' : 'Forgot Password?'}
        </button>
        
        {authError && (
          <div className="p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-xs sm:text-sm">
            {authError}
          </div>
        )}
      </div>
    </div>
  );
}

export default SignIn; 