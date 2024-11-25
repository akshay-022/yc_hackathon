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
        // Fetch documents directly from Supabase
        const { data, error } = await supabase
          .from('documents')
          .select('*') // Select all fields or specify the fields you need
          .eq('user_id', user.id); // Filter by user ID

        if (error) {
          console.error('Error fetching documents:', error.message);
        } else {
          setDocuments(data); // Set the documents state with the fetched data
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

      // Log the response to check its structure
      console.log('Response from Supabase function:', response);

      // Check if the response has a 'data' property
      if (response.data) {
        // Use the data directly if it's already in JSON format
        const document = response.data.document; // Access the document directly
        // Add the new document to the documents list
        setDocuments((prevDocuments) => [...prevDocuments, document]);
        setContent('');
      } else {
        console.error('Error:', response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleRemoveDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId); // Specify the document to delete

      if (error) {
        console.error('Error removing document:', error.message);
      } else {
        // Update the documents state to remove the deleted document
        setDocuments((prevDocuments) => prevDocuments.filter(doc => doc.id !== documentId));
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
            <li key={index} className="mb-1 flex justify-between items-center">
              <div>
                <span>{doc.summary}</span> {/* Adjust this based on the actual document structure */}
                <span className="text-gray-400 text-sm ml-2">
                  {new Date(doc.created_at).toLocaleDateString()} {/* Format the date */}
                </span>
              </div>
              <button
                onClick={() => handleRemoveDocument(doc.id)}
                className="text-red-500 hover:text-red-700 ml-4"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default AddContent; 