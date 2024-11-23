import { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignIn({ onAuthSuccess, onSwitchToSignUp }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      onAuthSuccess();
    } catch (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-800 text-center">Welcome Back</h2>
      <p className="text-gray-600 text-center">Sign in to continue</p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={handleSignIn}
        className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition duration-300"
      >
        Sign In
      </button>
      {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
    </div>
  );
}

export default SignIn; 