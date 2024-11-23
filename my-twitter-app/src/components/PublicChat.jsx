import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';

function PublicChat() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const backendUrl = useBackend();
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [isLoadingReply, setIsLoadingReply] = useState(false);

  useEffect(() => {
    let mounted = true;
    let messageSubscription = null;

    async function initializeChat() {
      try {
        // Fetch chat owner's username without auth check
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', userId)
          .single();

        if (profile?.username && mounted) {
          setUsername(profile.username);
        }

        // Get or create public conversation
        const { data: existingConv } = await supabase
          .from('conversations')
          .select('*')
          .eq('user_id', userId)
          .eq('is_public', true)
          .single();

        let convId;
        if (existingConv) {
          convId = existingConv.id;
        } else {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert([{ 
              user_id: userId, 
              is_public: true,
              title: `Public Chat with ${profile?.username || 'User'}`
            }])
            .select()
            .single();
          
          convId = newConv?.id;
        }

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
  }, [userId]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!message.trim() || isSending || !conversationId) return;

    setIsSending(true);
    setIsLoadingReply(true);

    try {
      // Insert user message
      const { data: userMessage, error: messageError } = await supabase
        .from('messages')
        .insert([{
          content: message,
          conversation_id: conversationId,
          is_bot: false
        }])
        .select()
        .single();

      if (messageError) throw messageError;
      setMessage('');

      // Process message with public endpoint
      const response = await fetch(`${backendUrl}/api/process-message-public`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
          conversation_id: conversationId,
          user_id: userId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to process message');
      }

      const responseData = await response.json();
      console.log('Bot response:', responseData);

    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally show error to user
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
      setIsLoadingReply(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

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
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg shadow-lg p-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">Chat with {username}</h1>
            <p className="text-gray-400 text-sm mt-1">Public Mirror Chat</p>
          </div>

          <div className="h-[70vh] bg-gray-800 rounded-lg mb-4 overflow-hidden">
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
              className="flex-1 bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSending || isLoadingReply}
            />
            <button
              type="submit"
              disabled={isSending || isLoadingReply || !message.trim()}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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