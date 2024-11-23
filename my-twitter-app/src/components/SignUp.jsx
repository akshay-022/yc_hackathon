import { useState } from 'react';
import { supabase } from '../supabaseClient';

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
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800 text-center">Create Account</h2>
      <p className="text-gray-600 text-center">Sign up to get started</p>
      
      {isSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative text-center">
          Sign up successful!
        </div>
      )}
      
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <button
        onClick={handleSignUp}
        disabled={isLoading || isSuccess}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
      >
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>
      {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
    </div>
  );
}

export default SignUp; 