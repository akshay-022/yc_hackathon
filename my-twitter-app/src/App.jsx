import { FaTwitter } from 'react-icons/fa'
import './App.css'

function App() {
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
      console.error('Twitter login failed:', error)
    }
  }

  return (
    <div className="login-container">
      <div className="content-wrapper">
        <div className="logo-section">
          <h1>Mirror</h1>
          <p className="tagline">Your real online self.</p>
        </div>
        
        <div className="login-section">
          <div className="login-card">
            <h2>Welcome Back</h2>
            <p className="subtitle">Connect your Twitter account to continue</p>
            <button
              onClick={handleTwitterLogin}
              className="twitter-button"
            >
              <FaTwitter className="twitter-icon" />
              Continue with Twitter
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
