import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function PublicChat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);

  // Check auth and initialize chat
  useEffect(() => {
    let mounted = true;
    let messageSubscription = null;

    async function initializeChat() {
      try {
        // Check authentication using getUser instead of getSession
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          const returnUrl = `${window.location.pathname}${window.location.search}`;
          navigate('/signin', {
            state: {
              returnTo: returnUrl,
              message: 'Please sign in to access this chat'
            },
            replace: true
          });
          return;
        }

        // Fetch chat owner's username
        if (mounted) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', userId)
            .single();

          if (profile?.username && mounted) {
            setUsername(profile.username);
          }

          // Get or create conversation
          const { data: existingConv } = await supabase
            .from('conversations')
            .select()
            .eq('user_id', userId)
            .eq('is_public', true)
            .single();

          let convId;
          if (existingConv) {
            convId = existingConv.id;
          } else {
            const { data: newConv } = await supabase
              .from('conversations')
              .insert({ user_id: userId, is_public: true })
              .select()
              .single();
            convId = newConv.id;
          }

          if (mounted) {
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

            // Subscribe to new messages
            messageSubscription = supabase
              .channel(`public_messages:${convId}`)
              .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `conversation_id=eq.${convId}`
              }, payload => {
                if (mounted) {
                  setMessages(current => [...current, payload.new]);
                }
              })
              .subscribe();
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeChat();

    return () => {
      mounted = false;
      if (messageSubscription) {
        messageSubscription.unsubscribe();
      }
    };
  }, [userId, navigate]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || isSending || !conversationId) return;

    try {
      setIsSending(true);
      const { error: messageError } = await supabase
        .from('messages')
        .insert([{
          content: message.trim(),
          conversation_id: conversationId,
          is_bot: false
        }]);

      if (messageError) throw messageError;

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
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

  return (
    <div className="min-h-screen bg-black-primary text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-black-secondary rounded-lg shadow-lg p-4">
          <h1 className="text-2xl font-bold mb-4">Chat with {username}</h1>
          
          {/* Messages Container */}
          <div className="h-[60vh] overflow-y-auto mb-4 space-y-4 p-4 bg-gray-900 rounded-lg">
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                className={`p-3 rounded-lg ${
                  msg.is_bot 
                    ? 'bg-blue-900 ml-auto' 
                    : 'bg-gray-800'
                } max-w-[80%] ${msg.is_bot ? 'ml-auto' : 'mr-auto'}`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending}
            />
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublicChat; 