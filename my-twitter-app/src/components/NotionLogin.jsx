import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function NotionLogin() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkNotionConnection();
  }, []);

  const checkNotionConnection = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Current user data:', {
        id: user?.id,
        email: user?.email,
        identities: user?.identities,
        app_metadata: user?.app_metadata
      });

      if (user?.identities) {
        const hasNotion = user.identities.some(
          identity => identity.provider === 'notion'
        );
        console.log('Has Notion connection:', hasNotion);
        setIsConnected(hasNotion);
      }
    } catch (error) {
      console.error('Error checking Notion connection:', error);
    }
  };

  const handleNotionLogin = async () => {
    try {
      console.log('Starting Notion auth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'notion',
        options: {
          redirectTo: 'https://tznrpdmwzpuispggvpdk.supabase.co/auth/v1/callback'
        }
      });
      
      if (error) throw error;
      console.log('Notion auth response:', data);

      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session after Notion auth:', {
        provider_token: session?.provider_token,
        access_token: session?.access_token,
        user: {
          id: session?.user?.id,
          email: session?.user?.email,
          identities: session?.user?.identities
        }
      });
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