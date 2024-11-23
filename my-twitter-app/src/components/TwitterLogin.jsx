import { FaTwitter } from 'react-icons/fa';

function TwitterLogin() {
  const handleTwitterLogin = async () => {
    try {
      const response = await fetch('http://localhost:5000/auth/twitter', {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.auth_url;
      } else {
        throw new Error('Failed to initialize Twitter login');
      }
    } catch (error) {
      console.error('Twitter login failed:', error);
    }
  };

  return (
    <div className="twitter-login-container">
      <h2>Connect to Twitter</h2>
      <button onClick={handleTwitterLogin} className="twitter-button">
        <FaTwitter className="twitter-icon" />
        Continue with Twitter
      </button>
    </div>
  );
}

export default TwitterLogin; 