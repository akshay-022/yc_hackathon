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
      className="flex flex-col items-center justify-center min-h-screen"
      onMouseMove={handleMouseMove}
      style={{
        background: `radial-gradient(circle at ${gradientPosition.x}% ${gradientPosition.y}%, rgba(79, 70, 229, 0.8), rgba(236, 72, 153, 0.8) ${gradientSize}%)`,
      }}
    >
      <div className="max-w-md w-full p-6 bg-black-secondary rounded-lg shadow-lg">
        {isSignUp ? (
          <SignUp onAuthSuccess={handleAuthSuccess} onSignUpSuccess={handleSignUpSuccess} />
        ) : (
          <SignIn onAuthSuccess={handleAuthSuccess} onSwitchToSignUp={toggleAuthMode} />
        )}

        <div className="mt-6 text-center">
          <button
            onClick={toggleAuthMode}
            className="text-indigo-600 hover:text-indigo-500 font-medium"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
