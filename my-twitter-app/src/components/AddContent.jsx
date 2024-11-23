import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function AddContent() {
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user ? user.id : null);

      const response = await fetch('http://localhost:8000/api/add-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content: content }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log('Content added successfully:', result.message);
        setContent('');
      } else {
        console.error('Error adding content:', result.detail);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Add New Content</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter content here..."
        className="w-full h-32 p-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
      />
      <button
        onClick={handleSubmit}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
      >
        Add Content
      </button>
    </div>
  );
}

export default AddContent; 