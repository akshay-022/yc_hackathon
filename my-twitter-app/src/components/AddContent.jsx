import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';

function AddContent({ onContentAdded }) {
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const backendUrl = useBackend();

  useEffect(() => {
    const fetchUserDocuments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user ? user.id : null);

        if (user) {
          const response = await fetch(`${backendUrl}/api/user-documents/${user.id}`);
          const result = await response.json();
          if (response.ok) {
            setDocuments(result.documents);
          } else {
            console.error('Error fetching documents:', result.detail);
          }
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };

    fetchUserDocuments();
  }, [backendUrl]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    console.log('Submitting content:', content);

    try {
      const response = await fetch(`${backendUrl}/api/add-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, content: content }),
      });

      const result = await response.json();
      if (response.ok) {
        console.log('Content added successfully:', result.message);
        setContent('');
        setDocuments([...documents, { id: result.document_id, created_at: new Date().toISOString() }]);
        onContentAdded();
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
      <div className="mt-4">
        <h3 className="text-lg font-semibold text-white mb-2">Your Documents</h3>
        <ul className="text-white">
          {documents.map((doc, index) => (
            <li key={index} className="mb-2">
              <div>{doc.content}</div>
              <div className="text-xs text-gray-500 mt-1 inline-block bg-gray-200 rounded-full px-2 py-1">
                {new Date(doc.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AddContent; 