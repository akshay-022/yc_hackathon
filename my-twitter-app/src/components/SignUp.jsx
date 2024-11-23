import { useState } from 'react';
import { supabase } from '../supabaseClient';

function SignUp({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState(null);

  const handleSignUp = async () => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      alert('Check your email for the confirmation link!');
      onAuthSuccess();
    } catch (error) {
      setAuthError(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-gray-700">Sign Up</h2>
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
        onClick={handleSignUp}
        className="w-full bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
      >
        Sign Up
      </button>
      {authError && <p className="text-red-500">{authError}</p>}
    </div>
  );
}

export default SignUp; 