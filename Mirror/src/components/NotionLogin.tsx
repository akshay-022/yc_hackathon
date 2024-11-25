import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function NotionLogin() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkNotionConnection();
  }, []);

  const checkNotionConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.identities) {
        const hasNotion = user.identities.some(
          identity => identity.provider === 'notion'
        );
        setIsConnected(hasNotion);
      }
    } catch (error) {
      console.error('Error checking Notion connection:', error);
    }
  };

  const handleNotionLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'notion',
        options: {
          redirectTo: 'https://tznrpdmwzpuispggvpdk.supabase.co/auth/v1/callback'
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Error with Notion auth:', error.message);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        checked={isConnected}
        readOnly
        className="h-4 w-4 text-blue-600"
      />
      <button 
        onClick={handleNotionLogin}
        className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {isConnected ? 'Connected to Notion' : 'Connect Notion'}
      </button>
    </div>
  );
}

export default NotionLogin; 