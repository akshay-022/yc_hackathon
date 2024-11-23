from flask import Flask, jsonify, redirect, request, session
from flask_cors import CORS
import tweepy
from decouple import config

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.secret_key = config('SESSION_SECRET')  # Add this to your .env file

@app.route('/auth/twitter')
def twitter_auth():
    try:
        # Initialize OAuth handler
        auth = tweepy.OAuthHandler(
            config('TWITTER_API_KEY'),
            config('TWITTER_API_SECRET'),
            callback='http://localhost:5000/auth/twitter/callback'
        )
        
        # Get the authorization URL
        auth_url = auth.get_authorization_url()
        
        # Store the request token in session
        session['request_token'] = auth.request_token
        
        return jsonify({'auth_url': auth_url})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/auth/twitter/callback')
def twitter_callback():
    try:
        # Get the request token from session
        request_token = session.get('request_token')
        
        # Remove the request token from session
        del session['request_token']
        
        auth = tweepy.OAuthHandler(
            config('TWITTER_API_KEY'),
            config('TWITTER_API_SECRET')
        )
        
        auth.request_token = request_token
        
        # Get the access token
        auth.get_access_token(request.args.get('oauth_verifier'))
        
        # Here you would typically:
        # 1. Store the access token in your database
        # 2. Create a user session
        # 3. Return user data
        
        # Redirect to your frontend
        return redirect('http://localhost:5173')  # Vite's default port
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True) 