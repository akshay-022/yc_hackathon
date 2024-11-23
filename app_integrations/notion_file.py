from notion_client import Client
from decouple import config
from typing import List, Dict, Any

def init_notion_client() -> Client:
    """
    Initialize Notion client with API key from .env
    """
    notion_key = config('NOTION_KEY')
    return Client(auth=notion_key)

def read_database_entries() -> List[Dict[Any, Any]]:
    """
    Read all entries from the Notion database
    Returns a list of database entries
    """
    notion = init_notion_client()
    database_id = config('NOTION_DATABASE_ID')
    
    try:
        # Query the database
        response = notion.databases.query(
            database_id=database_id
        )
        
        return response['results']
        
    except Exception as e:
        print(f"Error reading from Notion database: {str(e)}")
        raise

def get_page_content(page_id: str) -> Dict[Any, Any]:
    """
    Get detailed content of a specific page
    """
    notion = init_notion_client()
    
    try:
        # Get page content
        page_content = notion.pages.retrieve(page_id=page_id)
        # Get page blocks (actual content)
        blocks = notion.blocks.children.list(block_id=page_id)
        
        return {
            'metadata': page_content,
            'blocks': blocks['results']
        }
        
    except Exception as e:
        print(f"Error retrieving page content: {str(e)}")
        raise

if __name__ == "__main__":
    print("Testing Notion API integration...")
    print("-" * 50)
    
    try:
        # Test database reading
        print("\nReading database entries...")
        entries = read_database_entries()
        print(f"Successfully retrieved {len(entries)} entries")
        
        # If there are entries, test reading a specific page
        if entries:
            first_page_id = entries[0]['id']
            print(f"\nReading content from first page (ID: {first_page_id})...")
            page_content = get_page_content(first_page_id)
            
            # Print some basic info about the page
            print("\nPage Information:")
            if 'properties' in page_content['metadata']:
                for prop_name, prop_value in page_content['metadata']['properties'].items():
                    print(f"- {prop_name}")
            
            print("\nBlock Types Found:")
            for block in page_content['blocks']:
                print(f"- {block['type']}")
                
    except Exception as e:
        print(f"\nError during testing: {str(e)}")
