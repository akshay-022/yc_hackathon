import { supabase } from '../supabaseClient';

function NotionLogin() {
  const handleNotionLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
      options: {
        redirectTo: `${window.location.origin}/home`
      }
    });
    if (error) console.error('Error logging in with Notion:', error.message);
  };

  return (
    <button onClick={handleNotionLogin}>
      Login with Notion
    </button>
  );
}

export default NotionLogin; 