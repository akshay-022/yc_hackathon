import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useBackend } from '../BackendContext';
import { FaMicrophone } from 'react-icons/fa';

function AddContent({ hasUserContent }: { hasUserContent: boolean }) {
  const [content, setContent] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const backendUrl = useBackend();
  const micButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchUserDocuments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user ? user.id : null);

        if (user) {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id);

          if (error) {
            console.error('Error fetching documents:', error.message);
          } else {
            if (data) {
              hasUserContent = true;
            }
            setDocuments(data);
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
      const response = await supabase.functions.invoke('voyage', {
        body: { content: content, userId: userId, source: 'user' },
      });

      console.log('Response from Supabase function:', response);

      if (response.data) {
        const document = response.data.document;
        setDocuments((prevDocuments) => [...prevDocuments, document]);
        setContent('');
        hasUserContent = true;
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
        .eq('id', documentId);

      if (error) {
        console.error('Error removing document:', error.message);
      } else {
        setDocuments((prevDocuments) => prevDocuments.filter(doc => doc.id !== documentId));
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Your browser does not support speech recognition. Please use Chrome.');
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      setContent((prevContent) => prevContent + finalTranscript);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  useEffect(() => {
    const handleMouseUpOrLeave = () => {
      stopRecording();
    };

    const micButton = micButtonRef.current;
    if (micButton) {
      micButton.addEventListener('mouseleave', handleMouseUpOrLeave);
      micButton.addEventListener('mouseup', handleMouseUpOrLeave);
    }

    return () => {
      if (micButton) {
        micButton.removeEventListener('mouseleave', handleMouseUpOrLeave);
        micButton.removeEventListener('mouseup', handleMouseUpOrLeave);
      }
    };
  }, []);

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-white mb-4">Add New Content</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter content here..."
        className="w-full h-32 p-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        disabled={isRecording}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50"
          disabled={isRecording}
        >
          Add Content
        </button>
        <button
          ref={micButtonRef}
          onMouseDown={startRecording}
          className={`flex items-center justify-center w-12 h-12 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-300 ${isRecording ? 'animate-pulse' : ''}`}
        >
          <FaMicrophone />
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Your Documents</h3>
        <ul className="list-disc list-inside text-white">
          {documents.map((doc, index) => (
            <li key={index} className="mb-1 flex justify-between items-center">
              <div>
                <span>{doc.summary}</span>
                <span className="text-gray-400 text-sm ml-2">
                  {new Date(doc.created_at).toLocaleDateString()}
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