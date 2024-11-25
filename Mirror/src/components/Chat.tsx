import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';
import { FaTrash } from 'react-icons/fa';

interface Message {
  id: number;
  content: string;
  is_bot: boolean;
  created_at: string;
}

interface Conversation {
  id: number;
  title: string;
  created_at: string;
}

interface ChatProps {
  hasUserContent: boolean;
  username: string;
}

function Chat({ hasUserContent, username }: ChatProps) {
  const [message, setMessage] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoadingReply, setIsLoadingReply] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const backendUrl = useBackend();
  const inputRef = useRef<HTMLInputElement | null>(null); // Reference for the input field

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
          .select('*')
          .eq('source_user_id', userId)
          .eq('target_user_id', userId);
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
      setIsLoadingReply(true);

      // Add the user's message to the chat window
      const userMessage = {
        id: Date.now(), // Temporary ID for rendering
        content: message,
        is_bot: false,
        created_at: new Date().toISOString()
      };
      setMessages((prevMessages) => [...prevMessages, userMessage]);
      setMessage('');

      // Use Supabase Edge Function for processing
      const { data: responseData, error: responseError } = await supabase.functions.invoke('anthropic', {
        body: { content: message, sourceUserId: userId, targetUserId: userId, conversationId: selectedConversationId },
      });

      if (responseError) throw responseError;

      const botResponseContent = responseData.botResponseContent;
      const newConversationId = responseData.conversationId;
      const userMessageId = responseData.userMessageId;
      const botMessageId = responseData.botMessageId;
      console.log('Generated bot response:', botResponseContent);

      // Update the conversation ID if a new one was created
      if (!selectedConversationId) {
        setSelectedConversationId(newConversationId);
        setConversations((prevConversations) => [
          ...prevConversations,
          { id: newConversationId, title: `Conversation ${newConversationId}`, created_at: new Date().toISOString() }
        ]);
      }
      // Update the last message with the correct ID
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        updatedMessages[updatedMessages.length - 1].id = userMessageId;
        return updatedMessages;
      });

      // Insert the bot's response into the messages table
      const botMessage = {
        id: botMessageId, // Use the ID from the response
        content: botResponseContent,
        conversation_id: newConversationId,
        is_bot: true,
        created_at: new Date().toISOString()
      };

      setMessages((prevMessages) => [...prevMessages, botMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setIsLoadingReply(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
    setMessages([]);
  };

  const handleRenameConversation = async (e: React.KeyboardEvent<HTMLInputElement>, conversationId: number) => {
    
    if (e.key === 'Enter' && newTitle.trim() !== '') {
      try {
        const { error } = await supabase
          .from('conversations')
          .update({ title: newTitle })
          .eq('id', conversationId)
          .eq('sourceUserId', userId)
          .eq('targetUserId', userId);
        if (error) throw error;

        // Update local state
        setConversations((prev) =>
          prev.map((conv) => (conv.id === conversationId ? { ...conv, title: newTitle } : conv))
        );
        setNewTitle(''); // Clear the input after renaming
      } catch (error) {
        console.error('Error renaming conversation:', error);
      }
    }
  };

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;

      // Update local state
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null); // Deselect if the deleted conversation was selected
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  // Handle click outside to deselect conversation
  const handleClickOutside = (event: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
      setSelectedConversationId(null);
      setNewTitle(''); // Clear the title when deselected
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex h-full">
        <div className="w-60 bg-gray-900 p-4 border-r border-gray-800 flex flex-col">
          <h3 className="text-white text-lg font-semibold mb-4">Conversations</h3>
          
          <div className="flex-1 overflow-y-auto mb-4">
            <ul className="space-y-2">
              {conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors relative ${
                    conversation.id === selectedConversationId 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setNewTitle(conversation.title); // Set the title for editing
                  }}
                >
                  <div className="truncate">
                    <input
                      ref={inputRef} // Attach the ref to the input
                      type="text"
                      value={conversation.id === selectedConversationId ? newTitle : conversation.title}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onKeyDown={(e) => handleRenameConversation(e, conversation.id)}
                      className={`bg-transparent border-none text-white focus:outline-none ${conversation.id === selectedConversationId ? 'block' : 'hidden'}`}
                    />
                    <span className={`text-lg ${conversation.id === selectedConversationId ? 'hidden' : 'block'}`}>
                      {conversation.title || `Conversation ${conversation.id}`}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(conversation.created_at).toLocaleDateString()}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering the onClick of the list item
                      handleDeleteConversation(conversation.id);
                    }}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleNewConversation}
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
          >
            New Chat
          </button>
        </div>

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
                <div className="flex justify-center">
                  <div className="text-white">Thinking...</div>
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