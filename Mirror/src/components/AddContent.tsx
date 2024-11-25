import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';

function AddContent({ onContentAdded }: { onContentAdded: () => void }) {
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
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
      // Use Supabase Edge Function for embedding
      const { data: embeddingData, error: embeddingError } = await supabase.functions.invoke('voyager', {
        body: { texts: [content]},
      });

      if (embeddingError) throw embeddingError;

      setContent('');
      onContentAdded();
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