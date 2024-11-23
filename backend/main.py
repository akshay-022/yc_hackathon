# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from notion_client import AsyncClient
import os
from dotenv import load_dotenv
from typing import Optional
from uuid import UUID, uuid4
from agent import AIClient
import traceback
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app_integrations.content_middleware import get_complete_content

# Load environment variables from .env file
load_dotenv()
import logging

logger = logging.getLogger(__name__)

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

def fetch_and_concatenate_user_documents(user_id: str, scrape_source: Optional[str] = None):
    try:
        # Start building the query
        query = supabase.table('documents').select('id, created_at').eq('user_id', user_id)

        # Conditionally add the scrape_source filter
        if scrape_source is not None:
            query = query.eq('scrape_source', scrape_source)

        # Execute the query
        document_response = query.execute()


        document_ids = [doc['id'] for doc in document_response.data]

        # If no documents are found, return an empty list
        if not document_ids:
            return []

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

            documents.append({
                "document_id": document_id,
                "content": documents_content,
                "created_at": document_response.data[index]['created_at']
            })

        return documents

    except Exception as e:
        print(f"Exception occurred: {e}")
        return []


@app.get("/api/user-documents/{user_id}")
async def get_user_documents(user_id: str):
    try:
        documents = fetch_and_concatenate_user_documents(user_id)
        return {"documents": documents}
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

        # Fetch user documents using the new function
        user_documents = fetch_and_concatenate_user_documents(user_id)

        # If no user content is found, generate a response without RAG
        if not user_documents:
            print("No user content found, generating response without RAG")
            bot_response_content = ai_client.generate_response_with_llm(content, [])
            print(f"Generated bot response without RAG: {bot_response_content}")
        else:
            # Combine all content
            k = 5
            print(user_documents)
            all_content = [doc['content'] for doc in user_documents]

            # Rerank documents using the AI client
            ranked_documents = ai_client.rerank_documents(all_content, content, k)
            
            if not ranked_documents:
                raise HTTPException(status_code=404, detail="No relevant documents found")

            # Use the AI client to generate a response based on the top-ranked documents
            top_documents = ranked_documents[:k]  # Get top 3 documents
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
    

class TokenRequest(BaseModel):
    access_token: str

async def get_blocks_recursively(notion_client, block_id, blocks):
    children = await notion_client.blocks.children.list(block_id=block_id, page_size=100)
    blocks.extend(children.get('results', []))

    for child in children.get('results', []):
        # If the block has children, recursively fetch them
        if child.get('has_children'):
            await get_blocks_recursively(notion_client, child['id'], blocks)

@app.post("/sync/notion")
async def sync_notion_content(request: TokenRequest):
    try:
        logger.debug(f"Received token request: {request}")
        provider_response = await get_provider_token('notion', request.access_token)
        logger.debug(f"Provider response: {provider_response}")
        notion_token = provider_response['identity']['access_token']
        user_id = provider_response['identity']['user_id']

        # Scrape all pages and blocks from Notion
        notion_client = AsyncClient(auth=notion_token)
        
        # Fetch all pages and databases
        all_pages = await get_all_pages_and_databases(notion_client)
        logger.debug(f"Fetched {len(all_pages)} pages/databases.")

        # Initialize a list to store all blocks
        all_blocks = []

        # Fetch blocks for each page
        for page in all_pages:
            page_blocks = []
            await get_blocks_recursively(notion_client, page['id'], page_blocks)
            all_blocks.append({
                'page_id': page['id'],
                'blocks': page_blocks
            })
            logger.debug(f"Fetched {len(page_blocks)} blocks for page {page['id']}.")

        # Here you can process or store the fetched pages and blocks as needed
        # For example, save them to your database or file system

        return {"status": "success", "message": "Notion content synced"}
    except Exception as e:
        logger.error(f"Error syncing Notion content: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def get_all_pages_and_databases(notion_client):
    pages = []
    next_cursor = None

    while True:
        response = await notion_client.search(
            **{
                "filter": {"property": "object", "value": "page"},
                "start_cursor": next_cursor,
                "page_size": 100,
            }
        )
        pages.extend(response.get('results', []))
        next_cursor = response.get('next_cursor')
        if not response.get('has_more'):
            break

    return pages

async def get_provider_token(provider: str, access_token: str):
    try:
        response = supabase.auth.get_user(access_token)
        if not response.user:
            raise HTTPException(status_code=401, detail="Invalid access token")
            
        identities = response.user.identities
        notion_identity = next((i for i in identities if i.provider == provider), None)
        
        # Debug log to see the structure
        logger.debug(f"Notion identity object: {notion_identity}")
        print(f"Notion identity object: {notion_identity}")
        
        if not notion_identity:
            raise HTTPException(status_code=404, detail=f"No {provider} connection found")
        

        return {
            "identity": {
                "access_token": notion_identity.identity_data.get('provider_id'),
                "user_id": response.user.id
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContentProcessRequest(BaseModel):
    text: str
    # user_id: str is not optional
    user_id: str

@app.post("/api/process-content")
async def process_content(request: ContentRequest):
    """
    Process text to extract and fetch content from all URLs.
    
    Args:
        request (ContentProcessRequest): Request containing text with URLs
    
    Returns:
        dict: Processed text with URL contents
    """
    try:
        logger.debug(f"Processing content request: {request.content}")
        
        # Process the content using get_complete_content
        processed_text = get_complete_content(request.content)
        
        # Reuse add_content logic
        content_request = ContentRequest(
            content=processed_text,
            user_id=request.user_id if hasattr(request, 'user_id') else None
        )
        
        print(processed_text)
        result = await add_content(content_request)
        
        return {
            "message": "Content processed successfully",
            "processed_text": processed_text,
            **result
        }
        
    except Exception as e:
        logger.error(f"Error processing content: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-message-public")
async def process_message_public(request: Request):
    try:
        body = await request.json()
        print(f"Raw request body: {body}")
        
        # Required fields validation
        required_fields = ['conversation_id', 'user_id', 'content']
        for field in required_fields:
            if field not in body:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Missing required field: {field}"
                )
        
        conversation_id = body['conversation_id']
        user_id = body['user_id']  # The user whose content we're using
        content = body['content']

        # Verify this is a public conversation
        conversation_response = supabase.table('conversations') \
            .select('*') \
            .eq('id', conversation_id) \
            .execute()

        if not conversation_response.data:
            raise HTTPException(
                status_code=403, 
                detail="Conversation not found or not public"
            )

        # Get the target user's documents
        user_documents = fetch_and_concatenate_user_documents(user_id)

        # Generate response based on available content
        if not user_documents:
            print("No user content found, generating response without RAG")
            bot_response_content = ai_client.generate_response_with_llm(content, [])
            print(f"Generated bot response without RAG: {bot_response_content}")
        else:
            k = 5
            print(f"Found user documents: {user_documents}")
            all_content = [doc['content'] for doc in user_documents]
            ranked_documents = ai_client.rerank_documents(all_content, content, k)
            
            if not ranked_documents:
                bot_response_content = ai_client.generate_response_with_llm(content, [])
                print(f"No relevant documents found, generating response without RAG: {bot_response_content}")
            else:
                top_documents = ranked_documents[:k]
                bot_response_content = ai_client.generate_response_with_llm(content, top_documents)
                print(f"Generated bot response with RAG: {bot_response_content}")

        # Insert bot response into messages
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
        print(f"Exception occurred in process_message_public: {e}")
        print(f"Exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    
    # Run the FastAPI server
    uvicorn.run(
        "main:app",
        host="localhost",  # Allows external access
        port=8000,       # Port number
        reload=True      # Auto-reload on code changes
    )



