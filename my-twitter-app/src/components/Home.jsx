import { useState } from 'react';
import TwitterLogin from './TwitterLogin';
import NotionLogin from './NotionLogin';

function Home() {
  const [twitterToken, setTwitterToken] = useState(null);
  const [notionToken, setNotionToken] = useState(null);

  const handleAuthentication = async () => {
    if (twitterToken && notionToken) {
      try {
        const response = await fetch('http://localhost:8000/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ twitter_token: twitterToken, notion_token: notionToken }),
        });

        const data = await response.json();
        console.log('Backend response:', data);
      } catch (error) {
        console.error('Error authenticating with backend:', error);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Welcome to Your Dashboard</h1>
          <p className="text-gray-600">Authenticate with your favorite services</p>
        </div>
        
        <div className="space-y-4">
          <TwitterLogin onTokenReceived={setTwitterToken} />
          <NotionLogin onTokenReceived={setNotionToken} />
          <button onClick={handleAuthentication} className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600">
            Authenticate with Backend
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home; 