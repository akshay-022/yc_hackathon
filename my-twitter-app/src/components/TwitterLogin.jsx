import { supabase } from '../supabaseClient';

function TwitterLogin() {
  const handleTwitterLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
    });
    if (error) console.error('Error logging in with Twitter:', error.message);
  };

  return (
    <button onClick={handleTwitterLogin}>
      Login with Twitter
    </button>
  );
}

export default TwitterLogin; 