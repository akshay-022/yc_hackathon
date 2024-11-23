# main.py
from fastapi import FastAPI, HTTPException, Depends
from supabase import create_client, Client
from typing import Optional, Dict
import os

app = FastAPI()

# Initialize Supabase client
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def get_user_session(access_token: str) -> Optional[dict]:
    """
    Get user session information using their access token
    """
    try:
        # Get user data from the access token
        response = supabase.auth.get_user(access_token)
        return response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid access token")

@app.get("/user/session")
async def get_session(access_token: str):
    """
    Endpoint to get user session information
    """
    try:
        user = await get_user_session(access_token)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return {
            "user_id": user.id,
            "email": user.email,
            "last_sign_in": user.last_sign_in_at,
            "user_metadata": user.user_metadata
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/auth-status")
async def check_auth_status(access_token: str):
    """
    Check if a user's auth token is valid
    """
    try:
        user = await get_user_session(access_token)
        return {
            "is_authenticated": bool(user),
            "user_id": user.id if user else None
        }
    except Exception as e:
        return {
            "is_authenticated": False,
            "error": str(e)
        }

@app.get("/user/provider-token/{provider}")
async def get_provider_token(provider: str, access_token: str):
    """
    Get auth provider token (twitter/notion) for a user
    
    Args:
        provider: 'twitter' or 'notion'
        access_token: User's Supabase access token
    """
    try:
        # First verify the user
        user_response = supabase.auth.get_user(access_token)
        user = user_response.user
        
        if not user:
            raise HTTPException(status_code=401, detail="Invalid access token")
        
        # The provider tokens are stored in user.identities
        identities = user.identities
        if not identities:
            raise HTTPException(status_code=404, detail="No identities found")
            
        # Find the specific provider
        provider_identity = next(
            (i for i in identities if i['provider'] == provider), 
            None
        )
        
        if not provider_identity:
            raise HTTPException(
                status_code=404, 
                detail=f"No {provider} identity found"
            )
            
        return {
            "provider": provider,
            "identity": provider_identity
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

