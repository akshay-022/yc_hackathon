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
from notion_client import Client as NotionClient

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

# Basic select all
def get_all_scraped_content():
    try:
        response = supabase.table('scraped_content').select("*").execute()
        return response.data
    except Exception as e:
        print(f"Error fetching scraped content: {e}")
        return None

# Filter by user_id
def get_user_scraped_content(user_id: str):
    try:
        response = supabase.table('scraped_content')\
            .select("*")\
            .eq('user_id', user_id)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching user content: {e}")
        return None

# Filter by source
def get_source_content(source: str):
    try:
        response = supabase.table('scraped_content')\
            .select("*")\
            .eq('scrape_source', source)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching source content: {e}")
        return None

# Insert single record
def insert_scraped_content(user_id: str, source: str, content: str, embeddings: list):
    try:
        data = {
            'user_id': user_id,
            'scrape_source': source,
            'content': content,
            'embeddings': embeddings
        }
        response = supabase.table('scraped_content').insert(data).execute()
        return response.data
    except Exception as e:
        print(f"Error inserting content: {e}")
        return None

# Batch insert
def batch_insert_scraped_content(records: list):
    try:
        response = supabase.table('scraped_content').insert(records).execute()
        return response.data
    except Exception as e:
        print(f"Error batch inserting content: {e}")
        return None
    

@app.post("/sync/notion")
async def sync_notion_content(access_token: str):
    """
    Syncs Notion content for a user and stores it in the scraped_content table
    """
    try:
        # Get Notion token using the existing provider token endpoint
        provider_response = await get_provider_token('notion', access_token)
        notion_token = provider_response['identity']['access_token']
        user_id = provider_response['identity']['user_id']
        
        # Initialize Notion client
        notion = NotionClient(auth=notion_token)
        
        # Get all pages user has access to
        pages = []
        cursor = None
        while True:
            response = notion.search(
                **({'start_cursor': cursor} if cursor else {})
            )
            pages.extend(response['results'])
            
            if not response['has_more']:
                break
            cursor = response['next_cursor']
        
        # Process and store pages
        records = []
        for page in pages:
            if page['object'] == 'page':
                # Get page content
                page_content = notion.blocks.children.list(page['id'])
                
                # Convert blocks to text (simplified)
                content = ""
                for block in page_content['results']:
                    if 'paragraph' in block:
                        if 'rich_text' in block['paragraph']:
                            for text in block['paragraph']['rich_text']:
                                if 'text' in text:
                                    content += text['text']['content'] + "\n"
                
                records.append({
                    'user_id': user_id,
                    'scrape_source': 'notion',
                    'content': content,
                    'metadata': {
                        'page_id': page['id'],
                        'title': page.get('properties', {}).get('title', {}).get('title', [{}])[0].get('text', {}).get('content', 'Untitled')
                    }
                })
        
        # Batch insert into database
        if records:
            result = batch_insert_scraped_content(records)
            return {
                "status": "success",
                "pages_synced": len(records),
                "data": result
            }
        
        return {
            "status": "success",
            "pages_synced": 0,
            "message": "No pages found to sync"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to sync Notion content: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allows external access
        port=8000,       # Port number
        reload=True      # Auto-reload on code changes
    )



