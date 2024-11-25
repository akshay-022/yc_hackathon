import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';

function Chat({ hasUserContent, username }: { hasUserContent: boolean, username: string }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingReply, setIsLoadingReply] = useState(false);
  const backendUrl = useBackend();

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : null);
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('*');
        if (error) throw error;
        setConversations(data);
      } catch (error) {
        console.error('Error fetching conversations:', error.message);
      }
    };

    fetchConversations();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedConversationId) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', selectedConversationId);
        if (error) {
          console.error('Error fetching messages:', error.message);
        } else {
          setMessages(data);
        }
      }
    };

    fetchMessages();
  }, [selectedConversationId]);

  const handleSendMessage = async () => {
    if (message.trim() === '' || isSending) return;

    console.log('Attempting to send message:', message);

    try {
      setIsSending(true);

      if (!selectedConversationId) {
        console.log('No conversation ID. Creating a new conversation...');
        const { data: conversationData, error: conversationError } = await supabase
          .from('conversations')
          .insert({ user_id: userId })
          .select()
          .single();
        if (conversationError) throw conversationError;

        setConversations((prevConversations) => [...prevConversations, conversationData]);
        setSelectedConversationId(conversationData.id);
        console.log('New conversation ID:', conversationData.id);
      }

      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert([{ content: message, conversation_id: selectedConversationId, is_bot: false }])
        .select();
      if (messageError) throw messageError;

      console.log('Message sent successfully:', messageData);

      setMessages((prevMessages) => [...prevMessages, ...messageData]);
      setMessage('');

      console.log('Sending message to backend API for processing...');
      setIsLoadingReply(true);

      // Use Supabase Edge Function for processing
      const { data: responseData, error: responseError } = await supabase.functions.invoke('anthropic', {
        body: { content: message},
      });

      if (responseError) throw responseError;

      const botResponseContent = responseData.choices[0].message.content;
      console.log('Generated bot response:', botResponseContent);

      // Insert the bot's response into the messages table
      const botMessage = {
        content: botResponseContent,
        conversation_id: selectedConversationId,
        is_bot: true
      };

      const botResponse = await supabase
        .from('messages')
        .insert([botMessage])
        .select()
        .single();
      console.log('Database response:', botResponse);

      setMessages((prevMessages) => [...prevMessages, { ...botMessage, created_at: new Date().toISOString() }]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setIsLoadingReply(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    console.log('Key press detected:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex h-full">
        {/* Sidebar for conversations */}
        <div className="w-60 bg-gray-900 p-4 border-r border-gray-800 flex flex-col">
          <h3 className="text-white text-lg font-semibold mb-4">Conversations</h3>
          
          {/* Conversation list with flex-1 to push button to bottom */}
          <div className="flex-1 overflow-y-auto mb-4">
            <ul className="space-y-2">
              {conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    conversation.id === selectedConversationId 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <div className="truncate">
                    {conversation.title || `Conversation ${conversation.id}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* New Chat button at bottom */}
          <button
            onClick={() => setSelectedConversationId(null)}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            New Chat
          </button>
        </div>

        {/* Chat window */}
        <div className="flex-1 flex flex-col p-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-white">Your Mirror</h2>
            <p className="text-gray-400 text-sm mt-1">Your digital conscience</p>
          </div>

          {!hasUserContent && (
            <div className="bg-gray-700 text-white p-2 rounded-md mb-4">
              I do not have enough information about {username} to mirror them.
            </div>
          )}

          <div className="flex-1 bg-gray-800 rounded-lg mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-4 pr-2" style={{ maxHeight: '300px' }}>
              {messages.map((msg, index) => (
                <div 
                  key={index} 
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
                <div className="flex justify-center">
                  <div className="text-white">Loading...</div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={isSending}
              className="flex-1 bg-gray-700 text-white p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Type your message..."
            />
            <button
              onClick={handleSendMessage}
              disabled={isSending || message.trim() === ''}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSending ? (
                <>
                  <span className="animate-pulse">Sending</span>
                  <span className="animate-pulse">...</span>
                </>
              ) : (
                'Send'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat; 