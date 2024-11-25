import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTwitter } from '@fortawesome/free-brands-svg-icons';
import { faN } from '@fortawesome/free-solid-svg-icons';
import { useBackend } from '../BackendContext';
import Chat from './Chat';
import AddContent from './AddContent';

interface AuthStatus {
  twitter: boolean;
  notion: boolean;
}

function Home() {
  const [username, setUsername] = useState<string>('User');
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ twitter: false, notion: false });
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [showPublicInfo, setShowPublicInfo] = useState<boolean>(false);
  const navigate = useNavigate();
  const backendUrl = useBackend();

  const createProfile = async (user: any, metadata: any, session: any) => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        console.log('Profile already exists, skipping creation');
        return;
      }

      const username = metadata.user_name || 
                      metadata.preferred_username || 
                      metadata.name || 
                      user.email?.split('@')[0] || 
                      `user_${user.id.slice(0, 8)}`;
      
      const email = user.email || `${username}@placeholder.com`;

      const profileData = {
        id: user.id,
        username: username,
        email: email,
        updated_at: new Date().toISOString(),
        twitter_username: metadata.user_name || null,
        twitter_access_token: session?.provider_token || null,
        twitter_refresh_token: session?.provider_refresh_token || null,
        twitter_token_expires_at: session ? null : null
      };

      console.log('Creating new profile with data:', profileData);

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id',
          ignoreDuplicates: false,
        });

      if (error) throw error;
      console.log('Profile created successfully');
    } catch (error) {
      console.error('Error in profile creation:', error);
    }
  };

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Checking auth status:', user);
        console.log('Session:', session);
        
        if (!user) {
          navigate('/');
          return;
        }

        const isNotionToken = session.provider_token.startsWith('ntn_');
        const isTwitterToken = /^\d+-/.test(session.provider_token);

        console.log('Is Notion Token:', isNotionToken);
        console.log('Is Twitter Token:', isTwitterToken);

        if (user.identities) {
          const status = {
            twitter: user.identities.some((id: any) => id.provider === 'twitter'),
            notion: user.identities.some((id: any) => id.provider === 'notion')
          };
          console.log('Auth status:', status);
          setAuthStatus(status);

          if (isTwitterToken) {
            await createProfile(user, user.user_metadata, session);
            
            const { data: profile } = await supabase
              .from('profiles')
              .select('twitter_username')
              .eq('id', user.id)
              .single();

            const twitterUsername = user.user_metadata?.user_name || 
                                  user.user_metadata?.preferred_username;

            if (twitterUsername) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  twitter_username: twitterUsername,
                  twitter_access_token: session?.provider_token || null,
                  twitter_refresh_token: session?.provider_refresh_token || null,
                  twitter_token_expires_at: session?.expires_at ? null : null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

              if (updateError) console.error('Error updating Twitter username and token:', updateError);
              else console.log('Twitter username and token updated successfully:', twitterUsername);
            }
          }

          if (isNotionToken) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .single();

            if (profile) {
              const { error: updateError } = await supabase
                .from('profiles')
                .update({ 
                  notion_access_token: session?.provider_token || null,
                  notion_refresh_token: session?.provider_refresh_token || null,
                  notion_token_expires_at: session?.expires_at ? null : null,
                  updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

              if (updateError) console.error('Error updating Notion tokens:', updateError);
              else console.log('Notion tokens updated successfully');
            }
          }
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
      }
    };

    checkAuthStatus();

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        navigate('/');
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, [navigate]);

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
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Twitter identity linking error:', error.message);
    }
  };

  const handleNotionAuth = async () => {
    try {
      if (authStatus.notion) {
        // First get user identities
        const { data: { identities }, error: identitiesError } = await supabase.auth.getUserIdentities();
        if (identitiesError) throw identitiesError;

        // Find Notion identity
        const notionIdentity = identities?.find((identity) => identity.provider === 'notion');
        if (!notionIdentity) {
          throw new Error('Notion identity not found');
        }

        // Unlink Notion identity
        const { data, error: unlinkError } = await supabase.auth.unlinkIdentity(notionIdentity);
        if (unlinkError) throw unlinkError;
        
        // Update local auth status
        setAuthStatus(prev => ({ ...prev, notion: false }));
        
        // Update profile in database
        const { data: { user } } = await supabase.auth.getUser();
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ 
            notion_access_token: null,
            notion_refresh_token: null,
            notion_token_expires_at: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;
        
        console.log('Notion successfully delinked');
      }

      // Always proceed with linking (either after delinking or fresh link)
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'notion',
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });
      if (error) throw error;
      
    } catch (error) {
      console.error('Notion identity linking/unlinking error:', error.message);
    }
  };

  const handleNotionSync = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Get the database ID from user's profile or environment

      const response = await supabase.functions.invoke('notion', {
        body: { 
          user_id: user.id 
        },
      });

      if (response.error) {
        throw new Error(`Failed to sync Notion content: ${response.error.message}`);
      }

      console.log('Notion sync successful:', response.data);
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

      <div className="h-full p-4">
        <div className={`h-full max-w-[90%] mx-auto ${
          !authStatus.twitter 
            ? 'flex justify-center items-start' 
            : 'grid grid-cols-[1fr_1fr]'
        } gap-4`}>
          {authStatus.twitter && (
            <div className="h-full bg-black-secondary rounded-lg shadow-lg p-4 flex flex-col overflow-auto">
              <AddContent />
            </div>
          )}

          <div className={`h-full flex flex-col gap-4 ${!authStatus.twitter ? 'w-[500px]' : ''}`}>
            <div className="bg-black-secondary rounded-lg shadow-lg p-4 overflow-auto">
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
                    <div className="mt-2 p-2 bg-gray-800 rounded-md space-y-2 max-h-[300px] overflow-auto">
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
              <div className="flex-1 bg-black-secondary rounded-lg shadow-lg p-4 flex flex-col min-h-0">
                <h2 className="text-2xl font-bold mb-4">Mirror Chat</h2>
                <div className="flex-1 overflow-auto">
                  <Chat hasUserContent={true} username={username} />
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