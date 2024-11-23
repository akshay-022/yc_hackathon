import { createClient } from '@supabase/supabase-js';
import Twitter from 'twitter-lite';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

export async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing up:', error.message);
        return { success: false, error: error.message };
    }

    console.log('User signed up:', data.user);
    return { success: true, user: data.user };
}

export async function fetchTweets(userId) {
    const user = await supabase.from('users').select('*').eq('id', userId).single();
    const twitterClient = new Twitter({
        subdomain: "api",
        version: "1.1",
        consumer_key: process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: user.twitter_access_token,
        access_token_secret: user.twitter_access_token_secret,
    });

    const tweets = await twitterClient.get('statuses/user_timeline', { user_id: user.twitter_id, count: 200 });
    await supabase.from('tweets').insert(tweets.map(tweet => ({
        user_id: userId,
        tweet_id: tweet.id_str,
        text: tweet.text,
        created_at: tweet.created_at,
    })));
} 