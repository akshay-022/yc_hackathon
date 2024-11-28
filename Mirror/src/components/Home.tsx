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
  const [nameofuser, setName] = useState<string>('');
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>({ twitter: false, notion: false });
  const [message, setMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [publicUrl, setPublicUrl] = useState<string>('');
  const [showPublicInfo, setShowPublicInfo] = useState<boolean>(false);
  const navigate = useNavigate();
  const backendUrl = useBackend();
  const [isReconnecting, setIsReconnecting] = useState<boolean>(
    localStorage.getItem('isReconnectingTwitter') === 'true'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string>('');
  const [isNotionSyncing, setIsNotionSyncing] = useState(false);

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
        name: user.name || username, 
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
        
        if (!user) {
          navigate('/');
          return;
        }

        if (user.identities) {
          const status = {
            twitter: user.identities.some((id: any) => id.provider === 'twitter'),
            notion: user.identities.some((id: any) => id.provider === 'notion')
          };
          
          if (isReconnecting && status.twitter) {
            setIsReconnecting(false);
            localStorage.removeItem('isReconnectingTwitter');
          }
          if (isReconnecting && status.notion) {
            setIsReconnecting(false);
            localStorage.removeItem('isReconnectingNotion');
          }
          
          
          setAuthStatus(status);

          
        }
        if (session?.provider_token) {
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
          console.log(user.user_metadata)
          if (isTwitterToken) {
            const twitterIdentity = user.identities?.find(
              (identity: any) => identity.provider === 'twitter'
            );
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ 
                twitter_username: user.user_metadata?.user_name || twitterIdentity?.identity_data?.user_name || null,
                twitter_access_token: session?.provider_token || null,
                twitter_refresh_token: session?.provider_refresh_token || null,
                twitter_token_expires_at: session?.expires_at ? null : null,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id);

            if (updateError) console.error('Error updating Twitter tokens:', updateError);
            else console.log('Twitter tokens updated successfully');
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
      }

        const { data: profile } = await supabase
          .from('profiles')
          .select('username, name')
          .eq('id', user.id)
          .single();
        
        if (profile?.username) {
          setUsername(profile.username);
          setName(profile.name);
        }

        // Check if we need to clean up old identities
        const oldTwitterIdentity = localStorage.getItem('twitterIdentityToUnlink');
        const oldNotionIdentity = localStorage.getItem('notionIdentityToUnlink');

        if (oldTwitterIdentity) {
          try {
            await supabase.auth.unlinkIdentity(JSON.parse(oldTwitterIdentity));
          } catch (unlinkError) {
            console.error('Error unlinking old Twitter identity:', unlinkError);
          }
          localStorage.removeItem('twitterIdentityToUnlink');
        }

        if (oldNotionIdentity) {
          try {
            await supabase.auth.unlinkIdentity(JSON.parse(oldNotionIdentity));
          } catch (unlinkError) {
            console.error('Error unlinking old Notion identity:', unlinkError);
          }
          localStorage.removeItem('notionIdentityToUnlink');
        }

      } catch (error) {
        console.error('Error:', error);
        navigate('/');
      } finally {
        setIsLoading(false);
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
  }, [navigate, isReconnecting]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen bg-black-primary text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
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
    try {
      // First try to link
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/home`
        }
      });

      if (error) {
        // Show error message to user
        setAuthError('This Twitter account is already linked to another user. Please use a different Twitter account or unlink it from the other user first.');
        console.log(error)
        return;
      }

      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      
    } catch (error: any) {
      console.error('Twitter auth error:', error.message);
      setAuthStatus(prev => ({ ...prev, twitter: false }));
    }
  };

  const handleNotionAuth = async () => {
    try {
      if (authStatus.notion) {
        // Get current identity before unlinking
        const { data: { identities } } = await supabase.auth.getUserIdentities();
        const notionIdentity = identities?.find((identity) => identity.provider === 'notion');
        
        if (notionIdentity) {
          // Unlink existing identity
          await supabase.auth.unlinkIdentity(notionIdentity);
        }

        // Start new OAuth flow
        const { data, error } = await supabase.auth.linkIdentity({
          provider: 'notion',
          options: {
            redirectTo: `${window.location.origin}/home`
          }
        });

        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      } else {
        // First time linking - normal flow
        const { data, error } = await supabase.auth.linkIdentity({
          provider: 'notion',
          options: {
            redirectTo: `${window.location.origin}/home`
          }
        });
        if (error) throw error;
        if (data?.url) window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('Notion auth error:', error.message);
      setAuthStatus(prev => ({ ...prev, notion: false }));
    }
  };

  const handleNotionSync = async () => {
    try {
      setIsNotionSyncing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

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
    } finally {
      setIsNotionSyncing(false);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const response = await fetch('https://tznrpdmwzpuispggvpdk.supabase.co/api/process-content', {
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
    <div className="min-h-screen bg-black-primary text-white flex flex-col">
      <div className="fixed top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-500 text-white text-sm sm:text-base rounded-md hover:bg-red-600 transition duration-300 disabled:opacity-50 shadow-md"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      <div className="flex-1 p-2 sm:p-4 w-full">
        <div className={`w-full sm:w-[90%] mx-auto ${
          (!authStatus.twitter && !isReconnecting)
            ? 'flex flex-col lg:flex-row justify-center items-center' 
            : 'grid grid-cols-1 lg:grid-cols-[1fr_1fr]'
        } gap-4 min-h-full`}>
          {(authStatus.twitter || isReconnecting) && (
            <div className="w-full bg-black-secondary rounded-lg shadow-lg p-3 sm:p-4 flex flex-col">
              <AddContent />
            </div>
          )}

          <div className={`w-full ${!authStatus.twitter ? 'max-w-[500px]' : ''}`}>
            <div className="bg-black-secondary rounded-lg shadow-lg p-3 sm:p-4">
              <div className="text-center mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-white">
                  Hello, {nameofuser || username}
                </h1>
                <p className="text-xs sm:text-sm text-gray-400 mt-2">
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
                    className="flex-1 bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-md hover:bg-blue-600 transition duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <FontAwesomeIcon icon={faTwitter} className="w-4 h-4 sm:w-5 sm:h-5" />
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
                    disabled={isNotionSyncing}
                    className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 transition duration-300 flex items-center justify-center gap-2"
                  >
                    {isNotionSyncing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Syncing...</span>
                      </>
                    ) : (
                      'Sync Notion Content'
                    )}
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
                    <div className="mt-2 p-2 bg-gray-800 rounded-md space-y-2 max-h-[300px] overflow-auto text-sm sm:text-base">
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

                      <details className="group">
                        <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2">
                          <svg 
                            className="w-4 h-4 transform group-open:rotate-90 transition-transform" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          API Endpoint Example (Can embed in your own website)
                        </summary>
                        
                        <div className="mt-2 space-y-2 pl-6">
                          <div>
                            <p className="text-sm text-gray-400 mb-1">API Endpoint:</p>
                            <input
                              type="text"
                              value={`${backendUrl}/functions/v1/public-chat`}
                              readOnly
                              className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono"
                              onClick={e => e.target.select()}
                            />
                          </div>

                          <div>
                            <p className="text-sm text-gray-400 mb-1">Example Request:</p>
                            <pre className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`fetch('${backendUrl}/functions/v1/public-chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    user_id: "${publicUrl.split('/').pop()}",
    content: "Your message here",
    conversation_id: null  // Optional: Include to continue an existing conversation
  })
})`}
                            </pre>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400 mb-1">Example Response:</p>
                            <pre className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`{
  "reply": {
    "content": "Response from AI persona.",
    "conversation_id": 18742,
    "is_bot": true,
    "created_at": "2024-11-26T23:37:18.240Z"
  }
}`}
                            </pre>
                          </div>
                        </div>
                      </details>

                      <details className="group">
                        <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2">
                          <svg 
                            className="w-4 h-4 transform group-open:rotate-90 transition-transform" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Quick Implementation Example
                        </summary>
                        
                        <div className="mt-2 pl-6">
                          <pre className="w-full bg-gray-900 text-white p-2 rounded border border-gray-700 text-sm font-mono overflow-x-auto whitespace-pre-wrap">
{`<!-- Add this where you want the chat to appear -->
<div id="chat">
  <div id="messages"></div>
  <input id="input" placeholder="Type message...">
  <button onclick="send()">Send</button>
</div>

<script>
let conversationId = null;  // Store conversation ID

async function send() {
  const input = document.getElementById('input');
  const msg = input.value;
  input.value = '';
  
  addMessage(msg, 'user');
  
  const res = await fetch('${backendUrl}/functions/v1/public-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: "${publicUrl.split('/').pop()}",
      content: msg,
      conversation_id: conversationId
    })
  });
  
  const data = await res.json();
  conversationId = data.reply.conversation_id;
  addMessage(data.reply.content, 'ai');
}

function addMessage(text, from) {
  const messages = document.getElementById('messages');
  messages.innerHTML += \`<div class="\${from}">\${text}</div>\`;
}
</script>

<style>
#chat { width: 300px; border: 1px solid #ccc; }
#messages { height: 300px; overflow-y: auto; }
.user { text-align: right; }
.ai { text-align: left; }
</style>`}
                          </pre>
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>

            {authStatus.twitter && (
              <div className="bg-black-secondary rounded-lg shadow-lg p-4 flex flex-col">
                <h2 className="text-2xl font-bold mb-4">Mirror Chat</h2>
                <div className="h-[600px]">
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