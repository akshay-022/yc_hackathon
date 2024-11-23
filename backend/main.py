# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from typing import Optional
from uuid import UUID
from agent import generate_embeddings

# Load environment variables from .env file
load_dotenv()

app = FastAPI()

# Configure CORS to allow all localhost origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",     # Frontend
        "http://localhost:5173",     # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing required environment variables")

supabase: Client = create_client(supabase_url, supabase_key)

@app.get("/")
async def root():
    return supabase.table('conversations').select('*').execute()

class MessageRequest(BaseModel):
    conversation_id: int
    user_id: Optional[UUID]
    content: str

class ContentRequest(BaseModel):
    user_id: str
    content: str

@app.post("/api/add-content")
async def add_content(request: ContentRequest):
    try:
        # Generate embeddings using the agent
        embedding = generate_embeddings(request.content)
        print(len(embedding))
        if embedding is None:
            raise HTTPException(status_code=500, detail="Failed to generate embeddings")

        # Insert content and embeddings into the scraped_content table
        response = supabase.table('scraped_content').insert({
            'user_id': request.user_id,
            'content': request.content,
            'embeddings': embedding,
            'scrape_source': 'user'
        }).execute()

        if response.error:
            raise HTTPException(status_code=500, detail=str(response.error))

        return {"message": "Content added successfully"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-message")
async def process_message(request: Request):
    try:
        body = await request.json()
        print(f"Raw request body: {body}")
        message_request = MessageRequest(**body)
        print(f"Parsed request: {message_request}")

        # Generate bot response (placeholder - replace with your AI logic)
        bot_response_content = f"I received your message: {message_request.content}"
        print(f"Generated bot response: {bot_response_content}")

        # Insert the bot's response into the messages table
        bot_message = {
            'content': bot_response_content,
            'conversation_id': message_request.conversation_id,
            'is_bot': True
        }

        print(f"Inserting bot message into database: {bot_message}")
        bot_response = supabase.table('messages').insert(bot_message).execute()
        print(f"Database response: {bot_response}")

        if bot_response.status_code != 201:
            raise HTTPException(status_code=500, detail="Failed to insert bot message")

        return {
            "reply": {
                "content": bot_response_content,
                "conversation_id": message_request.conversation_id,
                "is_bot": True
            }
        }

    except Exception as e:
        print(f"Exception occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

