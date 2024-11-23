import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// variable for backend URL
const backendUrl = 'http://localhost:8000';

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [userId, setUserId] = useState(null);

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

  const handleNewChat = async () => {
    try {
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert({ user_id: userId })
        .select()
        .single();
      if (conversationError) throw conversationError;
      
      setSelectedConversationId(conversationData.id);
      setMessages([]);
      console.log('New conversation created with ID:', conversationData.id);
    } catch (error) {
      console.error('Error creating new conversation:', error.message);
    }
  };

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
      const response = await fetch(`${backendUrl}/api/process-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            conversation_id: selectedConversationId, 
            user_id: userId, 
            content: message 
        }),
      });
  
      const result = await response.json();
      if (response.ok) {
        console.log('Received reply from backend:', result.reply);
        setMessages((prevMessages) => [...prevMessages, result.reply]);
      } else {
        console.error('Error processing message:', result.detail);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e) => {
    console.log('Key press detected:', e.key);
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSelectConversation = (conversationId) => {
    setSelectedConversationId(conversationId);
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
                  onClick={() => handleSelectConversation(conversation.id)}
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
            onClick={handleNewChat}
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

          <div className="flex-1 bg-gray-800 rounded-lg p-4 mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto space-y-4 pr-2">
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