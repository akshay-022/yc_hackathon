import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SignIn from './components/SignIn';
import SignUp from './components/SignUp';
import LoginDesign from './components/LoginDesign';

function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const navigate = useNavigate();
  const [gradientPosition, setGradientPosition] = useState({ x: 50, y: 50 });
  const [gradientSize, setGradientSize] = useState(50);

  const handleAuthSuccess = () => {
    navigate('/home');
  };

  const toggleAuthMode = () => {
    if (isSignUp) {
      setSignUpSuccess(true);
    }
    setIsSignUp((prev) => !prev);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { offsetWidth, offsetHeight } = currentTarget;
    const x = (clientX / offsetWidth) * 100;
    const y = (clientY / offsetHeight) * 100;
    const size = Math.min(100, Math.max(30, 100 - (Math.abs(x - 50) + Math.abs(y - 50)) / 2));
    setGradientPosition({ x, y });
    setGradientSize(size);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full min-h-screen bg-black-primary">
      {/* Left side - Mirror AI Design */}
      <div className="w-full lg:w-[60%]">
        <LoginDesign />
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-[40%] min-h-[500px] lg:min-h-screen bg-black-secondary flex items-center justify-center p-4 sm:p-8 lg:p-12 border-t lg:border-l lg:border-t-0 border-gray-800">
        <div className="w-full max-w-[440px] space-y-6 sm:space-y-8">
          {isSignUp ? (
            <SignUp 
              onAuthSuccess={handleAuthSuccess} 
              onSignUpSuccess={() => setSignUpSuccess(true)}
              onSwitchToSignIn={toggleAuthMode} 
            />
          ) : (
            <SignIn 
              onAuthSuccess={handleAuthSuccess} 
              onSwitchToSignUp={toggleAuthMode}
              showSuccessMessage={signUpSuccess}
              onSuccessMessageDismiss={() => setSignUpSuccess(false)}
            />
          )}

          <div className="mt-4 sm:mt-6 text-center">
            <button
              onClick={toggleAuthMode}
              className="text-indigo-600 hover:text-indigo-500 font-medium text-sm sm:text-base"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 