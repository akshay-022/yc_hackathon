import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';

function AddContent() {
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const backendUrl = useBackend();

  // Function to fetch user documents
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

  useEffect(() => {
    fetchUserDocuments(); // Fetch documents on component mount
  }, [backendUrl]);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    console.log('Submitting content:', content);

    try {
      // Use Supabase Edge Function for embedding
      const response = await supabase.functions.invoke('voyage', {
        body: { content: content, userId: userId, source: 'user' },
      });

      const result = await response.json();

      if (response.ok) {
        // Clear the content input
        setContent('');
        // Refresh the documents list
        fetchUserDocuments(); // Fetch documents again to include the new one
      } else {
        console.error('Error:', result.error);
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

      {/* Display User Documents */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Your Documents</h3>
        <ul className="list-disc list-inside text-white">
          {documents.map((doc, index) => (
            <li key={index} className="mb-1">
              {doc.summary} {/* Adjust this based on the actual document structure */}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AddContent; 