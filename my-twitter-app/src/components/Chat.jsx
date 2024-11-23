import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (conversationId) {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId);
        if (error) {
          console.error('Error fetching messages:', error.message);
        } else {
          setMessages(data);
        }
      }
    };

    fetchMessages();
  }, [conversationId]);

  const sendMessage = async () => {
    if (message.trim() === '') return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ content: message, conversation_id: conversationId }])
        .select();
      if (error) throw error;

      setMessages((prevMessages) => [...prevMessages, ...data]);
      setMessage('');

      const response = await fetch('/api/process-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId, content: message }),
      });

      const result = await response.json();
      if (response.ok) {
        setMessages((prevMessages) => [...prevMessages, result.reply]);
      } else {
        console.error('Error processing message:', result.detail);
      }
    } catch (error) {
      console.error('Error sending message:', error.message);
    }
  };

  return (
    <div className="w-full bg-black-secondary rounded-lg shadow-lg p-6">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-white">Your mirror.</h2>
        <p className="text-gray-400 text-sm mt-1">Your digital conscience.</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-4 mb-4">
        <div className="overflow-y-auto h-[300px] space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div 
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.isBot 
                    ? 'bg-gray-700 text-white' 
                    : 'bg-blue-600 text-white'
                }`}
              >
                <p>{msg.content}</p>
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
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-gray-700 text-white p-2 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type your message..."
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
        >
          Send
        </button>
      </div>
    </div>
  );
}

export default Chat; 