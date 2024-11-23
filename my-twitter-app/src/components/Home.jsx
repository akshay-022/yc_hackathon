import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faN } from '@fortawesome/free-solid-svg-icons';

function Home() {
  const [username, setUsername] = useState('User');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error.message);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleTwitterAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
    });
    if (error) console.error('Twitter authentication error:', error.message);
  };

  const handleNotionAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
    });
    if (error) console.error('Notion authentication error:', error.message);
  };

  return (
    <div className="min-h-screen bg-black-primary text-white">
      {/* Logout button in top right */}
      <div className="absolute top-4 right-4">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 disabled:opacity-50 shadow-md"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="bg-black-secondary p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white">Hello, {username}</h1>
            <p className="text-base text-gray-400 mt-2">Authenticate with your favorite services</p>
          </div>
          
          <div className="space-y-4">
            <button 
              onClick={handleTwitterAuth} 
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
              Authenticate with Twitter
            </button>
            <button 
              onClick={handleNotionAuth} 
              className="w-full bg-gray-800 text-white py-2 rounded-md hover:bg-gray-900 transition duration-300 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faN} className="w-5 h-5" />
              Authenticate with Notion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 