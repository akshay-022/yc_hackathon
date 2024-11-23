import tweepy
from decouple import config  # For handling environment variables

def twitter_auth():
    """
    Handles Twitter OAuth authentication using tweepy
    Returns authenticated API object
    """
    # Load credentials from environment variables
    TWITTER_API_KEY = config('TWITTER_API_KEY')
    TWITTER_API_SECRET = config('TWITTER_API_SECRET')
    TWITTER_ACCESS_TOKEN = config('TWITTER_ACCESS_TOKEN')
    TWITTER_ACCESS_TOKEN_SECRET = config('TWITTER_ACCESS_TOKEN_SECRET')

    # Initialize OAuth handler
    auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
    auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)

    # Create API object
    api = tweepy.API(auth)
    
    return api

def verify_credentials():
    """
    Verifies if the credentials are valid
    Returns True if verification successful, False otherwise
    """
    try:
        api = twitter_auth()
        api.verify_credentials()
        print("Authentication Successful")
        return True
    except Exception as e:
        print(f"Authentication Error: {str(e)}")
        return False
