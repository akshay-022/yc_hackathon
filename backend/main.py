# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from typing import Optional
from uuid import UUID, uuid4
from agent import AIClient

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

# Initialize the AI client
ai_client = AIClient()

@app.get("/")
async def root():
    tables = {
        'conversations': supabase.table('conversations').select('*').execute(),
        'documents': supabase.table('documents').select('*').execute(),
        'messages': supabase.table('messages').select('*').execute(),
        'profiles': supabase.table('profiles').select('*').execute(),
        'scraped_content': supabase.table('scraped_content').select('*').execute()
    }
    return tables


class ContentRequest(BaseModel):
    user_id: str
    content: str

@app.post("/api/add-content")
async def add_content(request: ContentRequest):
    try:
        print("Raw request body:", request)
        # Generate a unique document_id for the entire document
        document_id = str(uuid4())

        # Insert a new document entry
        document_response = supabase.table('documents').insert({
            'id': document_id,
            'user_id': request.user_id,
            'scrape_source': 'user'
        }).execute()

        # Generate embeddings using the AI client
        chunks, embeddings = ai_client.generate_embeddings(request.content)
        if not chunks or not embeddings:
            raise HTTPException(status_code=500, detail="Failed to generate embeddings")

        # Insert each chunk and its corresponding embedding into the scraped_content table
        records = []
        for index, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            records.append({
                'document_id': document_id,  # Use the same document_id for all chunks
                'content': chunk,
                'embeddings': embedding,
                'chunk_index': index
            })

        # Batch insert records into the database
        response = supabase.table('scraped_content').insert(records).execute()

        return {"message": "Content added successfully", "chunks_added": len(records), "document_id": document_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-message")
async def process_message(request: Request):
    try:
        body = await request.json()
        print(f"Raw request body: {body}")
        conversation_id = body['conversation_id']
        user_id = body['user_id']
        content = body['content']

        # Fetch scraped content of different types
        user_content = get_user_scraped_content(str(user_id), 'user')

        # If no user content is found, generate a response without RAG
        if not user_content:
            bot_response_content = ai_client.generate_response_with_llm(content, [])
            print(f"Generated bot response without RAG: {bot_response_content}")
        else:
            # Combine all content
            print(user_content)
            all_content = user_content

            # Rerank documents using the AI client
            ranked_documents = ai_client.rerank_documents(all_content, content)
            if not ranked_documents:
                raise HTTPException(status_code=404, detail="No relevant documents found")

            # Use the AI client to generate a response based on the top-ranked documents
            top_documents = ranked_documents[:3]  # Get top 3 documents
            bot_response_content = ai_client.generate_response_with_llm(content, top_documents)
            print(f"Generated bot response: {bot_response_content}")

        # Insert the bot's response into the messages table
        bot_message = {
            'content': bot_response_content,
            'conversation_id': conversation_id,
            'is_bot': True
        }

        print(f"Inserting bot message into database: {bot_message}")
        bot_response = supabase.table('messages').insert(bot_message).execute()
        print(f"Database response: {bot_response}")

        return {
            "reply": {
                "content": bot_response_content,
                "conversation_id": conversation_id,
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
        return response.data or []
    except Exception as e:
        print(f"Error fetching scraped content: {e}")
        return []

# Filter by user_id
def get_user_scraped_content(user_id: str, source: str):
    try:
        response = supabase.table('scraped_content')\
            .select("*")\
            .eq('user_id', user_id)\
            .eq('scrape_source', source)\
            .execute()
        return response.data or []
    except Exception as e:
        print(f"Error fetching user content: {e}")
        return []

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

@app.get("/api/user-documents/{user_id}")
async def get_user_documents(user_id: str):
    try:
        # Fetch all document IDs for the user
        document_response = supabase.table('documents')\
            .select('id, created_at')\
            .eq('user_id', user_id)\
            .execute()


        document_ids = [doc['id'] for doc in document_response.data]

        # If no documents are found, return an empty list
        if not document_ids:
            return {"documents": []}

        documents = []

        # Fetch and concatenate content chunks for each document
        for index, document_id in enumerate(document_ids):
            response = supabase.table('scraped_content')\
                .select('content, chunk_index')\
                .eq('document_id', document_id)\
                .order('chunk_index')\
                .execute()

         

            # Concatenate the content chunks
            documents_content = "\n".join(chunk['content'] for chunk in response.data)

            documents.append({"document_id": document_id, "content": documents_content, "created_at": document_response.data[index]['created_at']})

        return {"documents": documents}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",  # Allows external access
        port=8000,       # Port number
        reload=True      # Auto-reload on code changes
    )



