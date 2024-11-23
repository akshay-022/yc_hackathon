# main.py
from fastapi import FastAPI, HTTPException
from supabase import create_client, Client
import os

app = FastAPI()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

@app.post("/authenticate")
async def authenticate_with_services(twitter_token: str, notion_token: str):
    try:
        # Example: Store tokens in Supabase
        response = supabase.table("user_tokens").insert({
            "twitter_token": twitter_token,
            "notion_token": notion_token
        }).execute()
        
        return {"message": "Tokens stored successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))