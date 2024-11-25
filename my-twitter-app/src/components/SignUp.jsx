import { useState } from 'react';
import { supabase } from '../supabaseClient';
import LoginDesign from './LoginDesign';

function SignUp({ onAuthSuccess, onSwitchToSignIn, onSignUpSuccess = () => {} }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [authError, setAuthError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);
      setIsSuccess(false);

      // First create the auth user with username
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            username,
            email,
          },
        ]);

      if (profileError) throw profileError;

      setIsSuccess(true);
      onSignUpSuccess();
      
      // Clear form
      setEmail('');
      setPassword('');
      setUsername('');
      
    } catch (error) {
      setAuthError(error.message);
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (

        <div className="flex w-full min-h-screen bg-black-primary">
          {/* Left side - Mirror AI Design */}
          <LoginDesign />
    
          {/* Right side - Auth Form */}
          <div className="w-[40%] min-w-[500px] bg-black-secondary min-h-screen flex items-center justify-center p-12 border-l border-gray-800">
            <div className="w-full max-w-[440px] space-y-6">
              <h1 className="text-2xl font-bold text-center mb-6 text-white">Create Account</h1>
              <p className="text-gray-400 text-center">Sign up to get started</p>
    
              {isSuccess && (
                <div className="p-3 bg-green-500/20 border border-green-500/30 rounded text-green-200 text-sm text-center">
                  Sign up successful!
                </div>
              )}
    
              <div className="space-y-4">
                {/* Form Fields */}
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  disabled={isLoading}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  disabled={isLoading}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSignUp}
                  disabled={isLoading || isSuccess}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
    
                {authError && (
                  <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-sm">
                    {authError}
                  </div>
                )}
    
                <div className="mt-6 text-center text-gray-400">
                  Already have an account?{' '}
                  <button
                    onClick={onSwitchToSignIn}
                    className="text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Sign in
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

  );
}

export default SignUp; 