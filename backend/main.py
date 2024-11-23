# main.py
from fastapi import FastAPI, HTTPException, Depends
from supabase import create_client, Client
from typing import Optional, Dict
import os
from notion_client import Client as NotionClient

app = FastAPI()

# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

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



