import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faN } from '@fortawesome/free-solid-svg-icons';
import Chat from './Chat';
import AddContent from './AddContent';

function Home() {
  const [username, setUsername] = useState('User');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState({
    twitter: false,
    notion: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated and fetch profile
    const checkAuthStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Checking auth status:', user);
        
        if (!user) {
          navigate('/');
          return;
        }

        // Check which providers are connected
        if (user.identities) {
          const status = {
            twitter: user.identities.some(id => id.provider === 'twitter'),
            notion: user.identities.some(id => id.provider === 'notion')
          };
          console.log('Auth status:', status);
          setAuthStatus(status);
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black-primary text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

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
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) console.error('Twitter authentication error:', error.message);
  };

  const handleNotionAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) console.error('Notion authentication error:', error.message);
  };

  const handleShowSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error fetching session:', error.message);
      return;
    }
    
    console.log('Current Session Data:', {
      accessToken: session?.access_token,
      providerToken: session?.provider_token,
      user: session?.user,
      expiresAt: session?.expires_at
    });
  };

  const ConnectedBadge = () => (
    <div className="flex items-center justify-center bg-green-500/10 border border-green-500/20 rounded-full w-8 h-8">
      <svg 
        className="w-4 h-4 text-green-500" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M5 13l4 4L19 7" 
        />
      </svg>
    </div>
  );

  const NotConnectedBadge = () => (
    <div className="flex items-center justify-center bg-gray-500/10 border border-gray-500/20 rounded-full w-8 h-8">
      <div className="w-4 h-4 rounded-full border-2 border-gray-500/40" />
    </div>
  );

  return (
    <div className="h-screen bg-black-primary text-white">
      {/* Logout button in top right */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 disabled:opacity-50 shadow-md"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Main content with fixed height */}
      <div className="h-screen pt-4 px-4 pb-4">
        <div className="h-[calc(100%-1rem)] max-w-[90%] mx-auto grid grid-cols-[1fr_1fr] gap-4">
          {/* Left side - Message Input */}
          {authStatus.twitter && (
            <div className="h-full bg-black-secondary rounded-lg shadow-lg p-4 flex flex-col">
              <h2 className="text-2xl font-bold mb-4">Your Message</h2>
              <div className="flex-1 flex flex-col min-h-0">
                <textarea
                  placeholder="Type your message or paste a URL..."
                  className="flex-1 p-4 bg-black-primary text-white rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none mb-4"
                />
                <div className="flex justify-end space-x-3">
                  <button className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition duration-300">
                    Clear
                  </button>
                  <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300">
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Right side - Split into Auth (top) and Chat (bottom) */}
          <div className="h-full flex flex-col gap-4">
            {/* Auth Content - Top */}
            <div className="bg-black-secondary rounded-lg shadow-lg p-4">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-white">
                  {authStatus.twitter ? 'Mirror' : 'Hello'}, {username}
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                  {authStatus.twitter 
                    ? 'Connect additional services'
                    : 'Please connect your Twitter account to continue'
                  }
                </p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  {authStatus.twitter ? <ConnectedBadge /> : <NotConnectedBadge />}
                  <button 
                    onClick={handleTwitterAuth} 
                    className="flex-1 bg-blue-500 text-white py-2.5 px-4 rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
                    {authStatus.twitter ? 'Connected to Twitter' : 'Authenticate with Twitter'}
                  </button>
                </div>

                <div className="flex items-center space-x-3">
                  {authStatus.notion ? <ConnectedBadge /> : <NotConnectedBadge />}
                  <button 
                    onClick={handleNotionAuth} 
                    className="flex-1 bg-gray-800 text-white py-2.5 px-4 rounded-md hover:bg-gray-900 transition duration-300 flex items-center justify-center gap-2"
                  >
                    <FontAwesomeIcon icon={faN} className="w-5 h-5" />
                    {authStatus.notion ? 'Connected to Notion' : 'Authenticate with Notion'}
                  </button>
                </div>
              </div>
              
              {authStatus.twitter && (
                <div className="mt-4">
                  <button 
                    onClick={handleShowSession}
                    className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition duration-300"
                  >
                    Show Current Session
                  </button>
                </div>
              )}
            </div>

            {/* Chat Window - Bottom */}
            {authStatus.twitter && (
              <div className="flex-1 bg-black-secondary rounded-lg shadow-lg p-4 min-h-0 flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Mirror Chat</h2>
                <div className="flex-1 min-h-0">
                  <Chat />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home; 