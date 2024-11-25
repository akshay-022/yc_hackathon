import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faN } from '@fortawesome/free-solid-svg-icons';
import { useBackend } from '../BackendContext';
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
  const [hasUserContent, setHasUserContent] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publicUrl, setPublicUrl] = useState('');
  const [showPublicInfo, setShowPublicInfo] = useState(false);
  const navigate = useNavigate();
  const backendUrl = useBackend();

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/');
          return;
        }

        if (user.identities) {
          const status = {
            twitter: user.identities.some(id => id.provider === 'twitter'),
            notion: user.identities.some(id => id.provider === 'notion')
          };
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

        const response = await fetch(`${backendUrl}/api/user-documents/${user.id}`);
        const result = await response.json();
        setHasUserContent(result.documents.length > 0);
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate]);

  const handleContentAdded = () => {
    setHasUserContent(true);
  };

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

  const handleNotionSync = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No access token found');

      const response = await fetch('http://localhost:8000/sync/notion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_token: session.access_token }),
      });

      if (!response.ok) throw new Error('Failed to sync Notion content');

      const data = await response.json();
      console.log('Notion sync successful:', data);
    } catch (error) {
      console.error('Error syncing Notion content:', error);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch('http://localhost:8000/api/process-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message,
          user_id: user.id
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process content');
      }

      const data = await response.json();
      console.log('Content processed:', data);
      
      setMessage('');
      
    } catch (error) {
      console.error('Error processing content:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShowPublicLink = async () => {
    try {
      if (!showPublicInfo) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('No user found');
          return;
        }
        setPublicUrl(`${window.location.origin}/chat/${user.id}`);
      }
      setShowPublicInfo(!showPublicInfo);
    } catch (error) {
      console.error('Error generating public link:', error);
    }
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
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition duration-300 disabled:opacity-50 shadow-md"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      <div className="h-screen pt-4 px-4 pb-4">
        <div className={`h-[calc(100%-1rem)] max-w-[90%] mx-auto ${
          !authStatus.twitter 
            ? 'flex justify-center items-start' 
            : 'grid grid-cols-[1fr_1fr]'
        } gap-4`}>
          {authStatus.twitter && (
            <div className="h-full bg-black-secondary rounded-lg shadow-lg p-4 flex flex-col">
              <AddContent onContentAdded={handleContentAdded} />
            </div>
          )}

          <div className={`h-full flex flex-col gap-4 ${!authStatus.twitter ? 'w-[500px]' : ''}`}>
            <div className="bg-black-secondary rounded-lg shadow-lg p-4">
              <div className="text-center mb-4">
                <h1 className="text-2xl font-bold text-white">
                  Hello, {username}
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                  {authStatus.twitter 
                    ? 'Your Twitter account is connected, access your digital conscience below.'
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
              
              {authStatus.twitter && authStatus.notion && (
                <div className="mt-4">
                  <button 
                    onClick={handleNotionSync}
                    className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition duration-300"
                  >
                    Sync Notion Content
                  </button>
                </div>
              )}

              {authStatus.twitter && (
                <div className="mt-4 space-y-2">
                  <button 
                    onClick={handleShowPublicLink}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2"
                  >
                    {showPublicInfo ? 'Hide Public Chat Info' : 'Show Public Chat Info'}
                  </button>
                  
                  {showPublicInfo && publicUrl && (
                    <div className="mt-2 p-2 bg-gray-800 rounded-md space-y-2">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">Public Chat URL:</p>
                        <input
                          type="text"
                          value={publicUrl}
                          readOnly
                          className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono"
                          onClick={e => e.target.select()}
                        />
                      </div>

                      <div>
                        <p className="text-sm text-gray-400 mb-1">API Endpoint:</p>
                        <input
                          type="text"
                          value={`${backendUrl}/api/process-message-public`}
                          readOnly
                          className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono"
                          onClick={e => e.target.select()}
                        />
                      </div>

                      <div>
                        <p className="text-sm text-gray-400 mb-1">Example Request:</p>
                        <pre className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`fetch('${backendUrl}/api/process-message-public', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: "${publicUrl.split('/').pop()}", // Your user ID
    content: "Your message here"
  })
})`}
                        </pre>
                      </div>

                      <div>
                        <p className="text-sm text-gray-400 mb-1">Response Format:</p>
                        <pre className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "reply": {
    "content": "AI response content",
    "conversation_id": "CONVERSATION_ID",
    "is_bot": true
  }
}`}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {authStatus.twitter && (
              <div className="flex-1 bg-black-secondary rounded-lg shadow-lg p-4 min-h-0 flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Mirror Chat</h2>
                <div className="flex-1 min-h-0">
                  <Chat hasUserContent={hasUserContent} username={username} />
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