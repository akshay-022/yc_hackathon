import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PublicChat() {
  const { targetUserId } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [targetUsername, setTargetUsername] = useState('');
  const [isLoadingUsernames, setIsLoadingUsernames] = useState(true);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setShowAuthModal(true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeChat() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsLoading(false);
          setIsLoadingUsernames(false);
          return;
        }

        const [{ data: { user } }, { data: targetProfile }] = await Promise.all([
          supabase.auth.getUser(),
          supabase
            .from('profiles')
            .select('name')
            .eq('id', targetUserId)
            .single()
        ]);
        
        if (!targetProfile) {
          setAuthError('User not found');
          setIsLoading(false);
          setIsLoadingUsernames(false);
          return;
        }

        if (user) {
          const { data: currentProfile } = await supabase
            .from('profiles')
            .select('name, id')
            .eq('id', user.id)
            .single();

          setCurrentUsername(currentProfile?.name || 'You');
          setTargetUsername(targetProfile?.name || 'User');
          setCurrentProfileId(currentProfile?.id);
        }

        const { data: newConv } = await supabase
        .from('conversations')
        .insert([{ 
            target_user_id: targetUserId, 
            source_user_id: user.id,
            title: `Chat between ${currentUsername} and ${targetUsername}`,
        }])
        .select()
        .single();
          
        const convId = newConv?.id;

        if (mounted && convId) {
          setConversationId(convId);

          // Fetch existing messages
          const { data: existingMessages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: true });

          if (mounted && existingMessages) {
            setMessages(existingMessages);
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
        setAuthError('Error loading chat');
      } finally {
        setIsLoading(false);
        setIsLoadingUsernames(false);
      }
    }

    initializeChat();

    const handleBeforeUnload = async () => {
      if (conversationId) {
        try {
          await supabase
            .from('conversations')
            .delete()
            .eq('id', conversationId)
            .eq('source_user_id', currentProfileId)
            .eq('target_user_id', targetUserId);
        } catch (error) {
          console.error('Error deleting conversation:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      mounted = false;
      handleBeforeUnload();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [targetUserId, conversationId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSending) return;

    console.log('Attempting to send message:', message);

    try {
      setIsSending(true);
      setIsLoadingReply(true);

      // Add the user's message to the chat window
      const userMessage = {
        content: message,
        conversation_id: conversationId,
        is_bot: false,
        created_at: new Date().toISOString()
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setMessage('');

      // Use Supabase Edge Function for processing
      const { data: responseData, error: responseError } = await supabase.functions.invoke('anthropic', {
        body: { content: message, sourceUserId: currentProfileId, targetUserId: targetUserId, conversationId },
      });

      if (responseError) throw responseError;

      const botResponseContent = responseData.botResponseContent;
      console.log('Generated bot response:', botResponseContent);

      // Insert the bot's response into the messages table
      const botMessage = {
        content: botResponseContent,
        conversation_id: conversationId,
        is_bot: true,
        created_at: new Date().toISOString()
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setIsLoadingReply(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      // Force a page reload after successful sign in
      window.location.reload();
      
    } catch (error: any) {
      setAuthError(error.message);
      setIsAuthenticating(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsAuthenticating(true);

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('No user data returned');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            username,
            name,
            email,
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) throw profileError;

      setIsSignUp(false);
      setAuthError('success:Account created! Please sign in.');
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsAuthenticating(false);
    }
  };

  if (showAuthModal) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {isSignUp ? 'Create Account' : 'Sign in'} to chat
          </h2>
          
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="space-y-4">
            {isSignUp && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase())}
                    className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {authError && (
              <div 
                className={`p-3 ${
                  authError.startsWith('success:')
                    ? 'bg-green-500/20 border border-green-500/30 text-green-200'
                    : 'bg-red-500/20 border border-red-500/30 text-red-200'
                } rounded text-sm`}
              >
                {authError.startsWith('success:') 
                  ? authError.substring(8) 
                  : authError
                }
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing in...'}</span>
                </>
              ) : (
                isSignUp ? 'Create Account' : 'Sign in'
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-blue-400 hover:text-blue-300 transition-colors text-sm mt-4"
            >
              {isSignUp 
                ? 'Already have an account? Sign in' 
                : "Don't have an account? Sign up"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4">
          <div className="text-center mb-3 sm:mb-4">
            {isLoadingUsernames ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <h1 className="text-lg sm:text-2xl font-bold text-gray-300">
                  Loading chat details...
                </h1>
              </div>
            ) : (
              <h1 className="text-lg sm:text-2xl font-bold break-words">
                {currentUsername} chatting with {targetUsername}
              </h1>
            )}
            <p className="text-gray-400 text-xs sm:text-sm mt-1">Public Mirror Chat</p>
          </div>

          <div className="h-[60vh] sm:h-[70vh] bg-gray-800 rounded-lg mb-3 sm:mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-4 p-4">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex ${msg.is_bot ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.is_bot 
                        ? 'bg-gray-700 text-white' 
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="text-xs opacity-50 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoadingReply && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 text-white px-4 py-2 rounded-lg">
                    <p className="animate-pulse">Thinking...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700 text-white p-2 sm:p-3 text-sm sm:text-base rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending || isLoadingReply}
            />
            <button
              type="submit"
              disabled={isSending || isLoadingReply || !message.trim()}
              className="bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
            >
              {isSending || isLoadingReply ? (
                <>
                  <span className="animate-pulse">Sending</span>
                  <span className="animate-pulse">...</span>
                </>
              ) : (
                'Send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublicChat; 