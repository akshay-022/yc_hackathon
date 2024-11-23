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

@app.post("/messages")
async def create_message(content: str):
    try:
        response = supabase.table("messages").insert({"content": content}).execute()
        return {"message": "Message stored successfully", "data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/messages")
async def get_messages():
    try:
        response = supabase.table("messages").select("*").execute()
        return {"data": response.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-message")
async def process_message(conversationId: int, content: str):
    try:
        # Fetch all messages for the conversation
        response = supabase.table("messages").select("*").eq("conversation_id", conversationId).execute()
        messages = response.data

        # Process the messages to generate a reply
        reply_content = process(messages, content)

        # Insert the reply into the messages table
        reply_response = supabase.table("messages").insert({
            "conversation_id": conversationId,
            "content": reply_content
        }).execute()

        return {"reply": reply_response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def process(messages, new_message):
    # Example processing logic: echo the last message
    return f"Echo: {new_message}"