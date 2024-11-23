# main.py
from fastapi import FastAPI, HTTPException, Depends
from supabase import create_client, Client
from typing import Optional, Dict
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


app = FastAPI()

# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)


def sync_notion_content(user_id: str, access_token: str, supabase_client):
    """
    Syncs Notion content for a user and stores it in the scraped_content table
    """
    try:
        # Get the provider token for Notion
        response = supabase_client.auth.get_user(access_token)
        user = response.user
        
        # Find Notion identity
        notion_identity = next(
            (i for i in user.identities if i['provider'] == 'notion'),
            None
        )
        
        if not notion_identity:
            raise Exception("No Notion identity found for user")
            
        notion_token = notion_identity.get('access_token')
        if not notion_token:
            raise Exception("No Notion access token found")
            
        # Initialize Notion client with user's token
        notion = Client(auth=notion_token)
        
        # Get all pages user has access to
        search_results = notion.search().get("results", [])
        
        # Process and store each page's content
        for page in search_results:
            page_id = page['id']
            page_content = notion.blocks.children.list(block_id=page_id)
            
            # Convert blocks to text content
            content_text = ""
            for block in page_content.get('results', []):
                if block['type'] == 'paragraph':
                    text = block.get('paragraph', {}).get('rich_text', [])
                    content_text += " ".join([t.get('plain_text', '') for t in text])
                    content_text += "\n"
            
            # Store in scraped_content table
            data = {
                'user_id': user_id,
                'scrape_source': 'notion',
                'content': content_text,
                'embeddings': None  # You can add embeddings processing here if needed
            }
            
            supabase_client.table('scraped_content').insert(data).execute()
            
        return {"status": "success", "pages_synced": len(search_results)}
        
    except Exception as e:
        print(f"Error syncing Notion content: {str(e)}")
        raise

if __name__ == "__main__":
    sync_notion_content("a6627ab3-4ffe-45cc-bfe0-e93b370e8989", "123", supabase)