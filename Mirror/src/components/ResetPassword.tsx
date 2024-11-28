import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function ResetPassword() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md px-4 sm:px-6 py-4 sm:py-6 bg-black-secondary rounded-lg">
        <h1 className="text-xl sm:text-2xl font-bold text-center mb-4 sm:mb-6 text-white">
          Reset Password
        </h1>

        {success ? (
          <div className="p-2 sm:p-3 text-sm sm:text-base bg-green-500/20 border border-green-500/30 rounded text-green-200 text-center">
            Password updated successfully! Redirecting...
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <button
              onClick={handleReset}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 text-sm sm:text-base rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>

            {error && (
              <div className="p-2 sm:p-3 bg-red-500/20 border border-red-500/30 rounded text-red-200 text-xs sm:text-sm">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPassword; 