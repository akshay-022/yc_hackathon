import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function TwitterLogin() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    checkTwitterConnection();
  }, []);

  const checkTwitterConnection = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      console.log('Current user data:', {
        id: user?.id,
        email: user?.email,
        identities: user?.identities
      });

      setCurrentUser(user);

      if (user?.identities) {
        const hasTwitter = user.identities.some(
          identity => identity.provider === 'twitter'
        );
        console.log('Has Twitter connection:', hasTwitter);
        setIsConnected(hasTwitter);
      }
    } catch (error) {
      console.error('Error checking Twitter connection:', error);
    }
  };

  const handleTwitterLogin = async () => {
    try {
      // Get current user before Twitter auth
      const { data: { user: existingUser } } = await supabase.auth.getUser();
      console.log('Existing user before Twitter auth:', existingUser);

      if (existingUser) {
        // Store current session details
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        const currentAccessToken = currentSession?.access_token;
        const currentRefreshToken = currentSession?.refresh_token;
        
        console.log('Current session tokens stored');

        // Initiate Twitter auth with linkIdentity
        const { data, error } = await supabase.auth.linkIdentity({
          provider: 'twitter'
        });

        if (error) throw error;
        console.log('Twitter identity linked:', data);

        // After successful linking, restore original session
        if (currentAccessToken && currentRefreshToken) {
          await supabase.auth.setSession({
            access_token: currentAccessToken,
            refresh_token: currentRefreshToken
          });
          console.log('Restored original session');
        }

        // Store Twitter provider token if available
        const { data: { session: newSession } } = await supabase.auth.getSession();
        if (newSession?.provider_token) {
          localStorage.setItem('twitter_provider_token', newSession.provider_token);
          console.log('Stored Twitter provider token');
        }
      } else {
        // Regular Twitter sign in for new users
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'twitter',
          options: {
            redirectTo: 'https://tznrpdmwzpuispggvpdk.supabase.co/auth/v1/callback'
          }
        });
        
        if (error) throw error;
        console.log('New Twitter sign in:', data);
      }

      // Refresh connection status
      await checkTwitterConnection();

    } catch (error) {
      console.error('Error with Twitter auth:', error);
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
        onClick={handleTwitterLogin}
        className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {isConnected ? 'Connected to Twitter' : currentUser ? 'Link Twitter Account' : 'Connect Twitter'}
      </button>
    </div>
  );
}

export default TwitterLogin; 