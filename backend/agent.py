import voyageai
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Voyage AI client
voyage_api_key = os.getenv("VOYAGE_API_KEY")
vo = voyageai.Client(api_key=voyage_api_key)

def generate_embeddings(content: str):
    try:
        # Generate embeddings for the content using Voyage AI
        result = vo.embed(
            texts=[content],
            model="voyage-3",
            input_type="document"
        )
        embedding = result.embeddings[0]
        # print embeddings shape
        print(len(embedding))
        return embedding
    except Exception as e:
        print(f"Error generating embeddings: {e}")
        return None
