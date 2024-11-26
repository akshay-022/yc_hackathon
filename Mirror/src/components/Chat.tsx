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
  const [isConversationsLoading, setIsConversationsLoading] = useState(false);

  useEffect(() => {
    const fetchUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : null);
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    const initializeConversation = async () => {
      if (!userId || conversations.length === 0) return;
      
      // If no conversation is selected, select the most recent one
      if (!selectedConversationId) {
        const mostRecent = conversations[conversations.length - 1];
        setSelectedConversationId(mostRecent.id);
      }
    };

    initializeConversation();
  }, [userId, conversations]);

  useEffect(() => {
    const fetchConversations = async () => {
      if (!userId) return;
      
      try {
        setIsConversationsLoading(true);
        const { data, error } = await supabase
          .from('conversations')
          .select('*')
          .eq('source_user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
          const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert([
              { 
                source_user_id: userId,
                target_user_id: userId,
                title: `New Chat ${new Date().toLocaleString()}`
              }
            ])
            .select()
            .single();

          if (createError) throw createError;
          setConversations([newConversation]);
          setSelectedConversationId(newConversation.id);
          setNewTitle(newConversation.title);
        } else {
          setConversations(data);
          if (!selectedConversationId) {
            setSelectedConversationId(data[0].id);
            setNewTitle(data[0].title);
          }
        }
      } catch (error) {
        console.error('Error fetching/creating conversations:', error);
      } finally {
        setIsConversationsLoading(false);
      }
    };

    fetchConversations();
  }, [userId]);

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
    if (message.trim() === '' || isSending || !selectedConversationId) return;

    try {
      setIsSending(true);
      setIsLoadingReply(true);

      const userMessage = {
        id: Date.now(),
        content: message,
        is_bot: false,
        created_at: new Date().toISOString(),
        conversation_id: selectedConversationId
      };

      setMessages(prevMessages => [...prevMessages, userMessage]);
      setMessage('');

      const { data: responseData, error: responseError } = await supabase.functions.invoke('anthropic', {
        body: { 
          content: message, 
          sourceUserId: userId, 
          targetUserId: userId, 
          conversationId: selectedConversationId
        },
      });

      if (responseError) throw responseError;

      if (responseData?.userMessageId) {
        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          if (lastMessage && !lastMessage.is_bot) {
            lastMessage.id = responseData.userMessageId;
          }
          return updatedMessages;
        });
      }

      if (responseData?.botResponseContent) {
        const botMessage = {
          id: responseData.botMessageId,
          content: responseData.botResponseContent,
          conversation_id: selectedConversationId,
          is_bot: true,
          created_at: new Date().toISOString()
        };
        setMessages(prevMessages => [...prevMessages, botMessage]);
      }

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

  const handleNewConversation = async () => {
    if (!userId) return;

    try {
      setIsConversationsLoading(true);
      const newTitle = `New Chat ${new Date().toLocaleString()}`;
      
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .insert([
          { 
            source_user_id: userId,
            target_user_id: userId,
            title: newTitle
          }
        ])
        .select()
        .single();

      if (conversationError) throw conversationError;

      const newConversation = {
        id: conversationData.id,
        title: conversationData.title,
        created_at: conversationData.created_at
      };

      setConversations(prev => [newConversation, ...prev]);
      setSelectedConversationId(newConversation.id);
      setNewTitle(newConversation.title);
      setMessages([]);
    } catch (error) {
      console.error('Error creating new conversation:', error);
    } finally {
      setIsConversationsLoading(false);
    }
  };

  const handleRenameConversation = async (e: React.KeyboardEvent<HTMLInputElement>, conversationId: number) => {
    if (e.key !== 'Enter') return;
    if (!userId || !newTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: newTitle.trim() })
        .eq('id', conversationId)
        .eq('source_user_id', userId);

      if (error) throw error;

      // Update local state
      setConversations(prevConversations => 
        prevConversations.map(conv => 
          conv.id === conversationId 
            ? { ...conv, title: newTitle.trim() }
            : conv
        )
      );

      // Remove focus from input
      (e.target as HTMLInputElement).blur();

    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  const handleDeleteConversation = async (conversationId: number) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      if (error) throw error;

      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      if (selectedConversationId === conversationId) {
        setSelectedConversationId(null);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
      // Reset the title to the current conversation title
      const currentConversation = conversations.find(conv => conv.id === selectedConversationId);
      if (currentConversation) {
        setNewTitle(currentConversation.title);
      }
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [conversations, selectedConversationId]);

  return (
    <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
      <div className="flex h-full">
        <div className="w-60 bg-gray-900 p-4 border-r border-gray-800 flex flex-col">
          <h3 className="text-white text-lg font-semibold mb-4">Conversations</h3>
          
          <div className="flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {conversations.map((conversation) => (
                <li
                  key={conversation.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors relative ${
                    isConversationsLoading ? 'opacity-50' : ''
                  } ${
                    conversation.id === selectedConversationId 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
                  }`}
                  onClick={() => {
                    setSelectedConversationId(conversation.id);
                    setNewTitle(conversation.title);
                  }}
                >
                  <div className="truncate">
                    <input
                      ref={inputRef}
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
                      e.stopPropagation();
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
            className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm mt-4"
          >
            New Chat
          </button>
        </div>

        <div className="flex-1 flex flex-col p-4">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white">Your Mirror</h2>
            <p className="text-gray-400 text-sm mt-1">Your digital conscience</p>
          </div>

          {!hasUserContent && (
            <div className="bg-gray-700 text-white p-2 rounded-md mb-4">
              I do not have enough information about {username} to mirror them.
            </div>
          )}

          <div className="flex-1 bg-gray-800 rounded-lg mb-4 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <div className="space-y-4">
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