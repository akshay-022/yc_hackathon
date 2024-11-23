import { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignIn({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);

  const handleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      alert('Signed in successfully!');
      onAuthSuccess();
    } catch (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-700">Sign In</h2>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        onClick={handleSignIn}
        className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
      >
        Sign In
      </button>
      {authError && <p className="text-red-500">{authError}</p>}
    </div>
  );
}

export default SignIn; 