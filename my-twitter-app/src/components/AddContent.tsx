import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';
import voyageai from 'voyageai';

const voyageClient = new voyageai.Client({ apiKey: process.env.VOYAGE_API_KEY });

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
      // Generate embeddings
      const chunks = splitContent(content, 4000);
      const embeddings = await Promise.all(chunks.map(chunk => 
        voyageClient.embed({ texts: [chunk], model: "voyage-3-lite", input_type: "document" })
      ));

      // Insert document and chunks into Supabase
      const documentId = await insertDocument(userId, 'user');
      await insertChunks(documentId, chunks, embeddings);

      setContent('');
      onContentAdded();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const splitContent = (content: string, maxLength: number): string[] => {
    return content.match(new RegExp(`.{1,${maxLength}}`, 'g')) || [];
  };

  const insertDocument = async (userId: string | null, source: string) => {
    const { data, error } = await supabase
      .from('documents')
      .insert({ user_id: userId, scrape_source: source })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  };

  const insertChunks = async (documentId: string, chunks: string[], embeddings: any[]) => {
    const records = chunks.map((chunk, index) => ({
      document_id: documentId,
      content: chunk,
      embeddings: embeddings[index].embeddings[0],
      chunk_index: index
    }));
    const { error } = await supabase.from('scraped_content').insert(records);
    if (error) throw error;
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