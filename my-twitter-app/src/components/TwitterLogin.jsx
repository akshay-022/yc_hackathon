import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom'; 

function TwitterLogin() {
  const navigate = useNavigate();

  const handleTwitterLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: 'https://tznrpdmwzpuispggvpdk.supabase.co/auth/v1/callback',
        scopes: 'tweet.read users.read'
      }
    });
    
    if (error) {
      console.error('Error logging in with Twitter:', error.message);
      return;
    }

    // Get session after successful login
    const { data: { session } } = await supabase.auth.getSession();
    
    // Access tokens are in session.provider_token (OAuth provider token)
    // and session.access_token (Supabase token)
    console.log('Provider token:', session?.provider_token);
    console.log('Supabase token:', session?.access_token);
  };

  return (
    <button 
      onClick={handleTwitterLogin}
      className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Login with Twitter
    </button>
  );
}

export default TwitterLogin; 