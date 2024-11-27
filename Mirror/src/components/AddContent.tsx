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
  const [contentType, setContentType] = useState<string>('about');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchUserDocuments = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user ? user.id : null);

        if (user) {
          const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

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
    setIsSubmitting(true);

    try {
      // First, process the content
      const processResponse = await supabase.functions.invoke('process-content', {
        body: { 
          text: content,
          user_id: userId 
        },
      });

      if (processResponse.error) {
        throw new Error(`Content processing failed: ${processResponse.error.message}`);
      }

      const processedText = processResponse.data.processedText;

      // Map dropdown selection to source type
      const sourceType = {
        'about': 'personal_info',
        'likes': 'liked_content',
        'thoughts': 'private_thoughts'
      }[contentType];

      console.log('Source type:', sourceType);
      // Use Supabase Edge Function for embedding with source type
      const response = await supabase.functions.invoke('voyage', {
        body: { 
          content: processedText, 
          userId: userId, 
          source: sourceType 
        },
      });

      console.log('Response from Supabase function:', response);

      if (response.data) {
        const document = response.data.document;
        setDocuments((prevDocuments) => [document, ...prevDocuments]);
        setContent('');
        hasUserContent = true;
      } else {
        console.error('Error:', response.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsSubmitting(false);
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
    <div className="bg-gray-800 p-6 rounded-lg shadow-md w-full h-[982px] flex flex-col">
      <h2 className="text-xl font-semibold text-white mb-4">Add New Content</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Enter content here..."
        className="w-full h-32 p-3 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        disabled={isRecording}
      />
      <div className="relative mb-4">
        <select
          value={contentType}
          onChange={(e) => setContentType(e.target.value)}
          className="appearance-none w-full py-2 px-3 text-sm text-white bg-gray-700 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
        >
          <option value="about" className="bg-gray-700 text-sm">Something about myself</option>
          <option value="likes" className="bg-gray-700 text-sm">Content I like</option>
          <option value="thoughts" className="bg-gray-700 text-sm">My thoughts (Don't reveal to others)</option>
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
          <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={handleSubmit}
          disabled={isRecording || isSubmitting}
          className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Adding...</span>
            </>
          ) : (
            'Add Content'
          )}
        </button>
        <button
          ref={micButtonRef}
          onMouseDown={startRecording}
          className={`flex items-center justify-center w-12 h-12 bg-red-600 text-white rounded-full hover:bg-red-700 transition duration-300 ${isRecording ? 'animate-pulse' : ''}`}
        >
          <FaMicrophone />
        </button>
      </div>

      <div className="flex-1 min-h-0">
        <h3 className="text-lg font-semibold text-white mb-2">Your Documents</h3>
        <div className="h-[calc(100%-2rem)] overflow-y-auto pr-2">
          <ul className="list-disc list-inside text-white space-y-2">
            {documents.map((doc, index) => (
              <li key={index} className="flex justify-between items-start py-2 hover:bg-gray-700/50 rounded px-2">
                <div className="flex-1 min-w-0">
                  <span className="block text-sm break-words">{doc.summary}</span>
                  <span className="text-gray-400 text-xs">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveDocument(doc.id)}
                  className="text-red-500 hover:text-red-700 ml-4 shrink-0"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AddContent;