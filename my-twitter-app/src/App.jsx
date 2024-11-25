import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';

function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();
  const [gradientPosition, setGradientPosition] = useState({ x: 50, y: 50 });
  const [gradientSize, setGradientSize] = useState(50);

  const handleAuthSuccess = () => {
    navigate('/home');
  };

  const handleSignUpSuccess = () => {
    console.log('Sign up successful!');
  };

  const toggleAuthMode = () => {
    setIsSignUp((prev) => !prev);
  };

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e;
    const { offsetWidth, offsetHeight } = currentTarget;
    const x = (clientX / offsetWidth) * 100;
    const y = (clientY / offsetHeight) * 100;
    const size = Math.min(100, Math.max(30, 100 - (Math.abs(x - 50) + Math.abs(y - 50)) / 2));
    setGradientPosition({ x, y });
    setGradientSize(size);
  };

  return (
    <div 
      className="min-h-screen bg-black-primary"
      onMouseMove={handleMouseMove}
      style={{
        background: `radial-gradient(circle at ${gradientPosition.x}% ${gradientPosition.y}%, rgba(79, 70, 229, 0.15), rgba(236, 72, 153, 0.15) ${gradientSize}%), rgb(0, 0, 0)`,
      }}
    >
      {isSignUp ? (
        <SignUp 
          onAuthSuccess={handleAuthSuccess} 
          onSignUpSuccess={handleSignUpSuccess} 
          onSwitchToSignIn={toggleAuthMode} 
        />
      ) : (
        <SignIn 
          onAuthSuccess={handleAuthSuccess} 
          onSwitchToSignUp={toggleAuthMode} 
        />
      )}
    </div>
  );
}

export default App;
