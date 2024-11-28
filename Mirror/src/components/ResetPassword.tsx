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
    <div className="min-h-screen bg-black-primary flex items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      <div className="w-full max-w-[90%] sm:max-w-md bg-black-secondary rounded-lg shadow-xl">
        <div className="px-4 sm:px-8 py-6 sm:py-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8 text-white">
            Reset Password
          </h1>

          {success ? (
            <div className="p-3 sm:p-4 text-sm sm:text-base bg-green-500/20 border border-green-500/30 rounded-lg text-green-200 text-center">
              Password updated successfully! Redirecting...
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm sm:text-base text-gray-200">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 text-base bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="block text-sm sm:text-base text-gray-200">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 text-base bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                />
              </div>

              <button
                onClick={handleReset}
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 text-base rounded-lg hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>

              {error && (
                <div className="p-3 sm:p-4 mt-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 text-sm sm:text-base">
                  {error}
                </div>
              )}

              <button
                onClick={() => navigate('/')}
                className="w-full text-gray-400 hover:text-white text-sm sm:text-base transition duration-300 mt-4"
              >
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResetPassword; 