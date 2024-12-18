import { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignUp({ onAuthSuccess, onSwitchToSignIn, onSignUpSuccess = () => {} }: { onAuthSuccess: () => void, onSwitchToSignIn: () => void, onSignUpSuccess?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSignUp = async () => {
    try {
      setIsLoading(true);
      setAuthError(null);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name,
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
            name,
          },
        ]);

      if (profileError) throw profileError;
      
      onSwitchToSignIn();
      
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 w-full max-w-sm px-4 sm:px-0">
      <h2 className="text-xl sm:text-2xl font-semibold text-center text-white">Create Account</h2>
      <p className="text-sm sm:text-base text-gray-600 text-center text-gray-110">Sign up to get started</p>
      
      {isSuccess && (
        <div className="text-sm sm:text-base bg-green-100 border border-green-400 text-green-700 px-3 py-2 sm:px-4 sm:py-3 rounded relative text-center">
          Sign up successful!
        </div>
      )}
      
      <input
        type="text"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={isLoading}
      />
      <button
        onClick={handleSignUp}
        disabled={isLoading || isSuccess}
        className="w-full bg-blue-500 text-white py-2 text-sm sm:text-base rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition duration-300"
      >
        {isLoading ? 'Signing up...' : 'Sign Up'}
      </button>
      {authError && <p className="text-red-500 text-xs sm:text-sm text-center">{authError}</p>}
    </div>
  );
}

export default SignUp; 