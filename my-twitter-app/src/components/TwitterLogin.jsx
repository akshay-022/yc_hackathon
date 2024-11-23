import { supabase } from '../supabaseClient';

function TwitterLogin() {
  const handleTwitterLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Optional: Specify which Twitter scopes you need
        scopes: 'tweet.read users.read',
      }
    });
    
    if (error) {
      console.error('Error logging in with Twitter:', error.message);
    }
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