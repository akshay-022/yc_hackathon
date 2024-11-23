import voyageai
import anthropic
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class AIClient:
    def __init__(self):
        # Initialize Voyage AI client
        voyage_api_key = os.getenv("VOYAGE_API_KEY")
        self.voyage_client = voyageai.Client(api_key=voyage_api_key)

        # Initialize Anthropic API client
        anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
        self.anthropic_client = anthropic.Anthropic(api_key=anthropic_api_key)

    def split_content(self, content: str, max_length: int) -> list:
        # Split content into chunks of max_length
        return [content[i:i+max_length] for i in range(0, len(content), max_length)]

    def generate_embeddings(self, content: str):
        try:
            # Define the maximum length for each chunk
            max_length = 4000  # Example length, adjust based on model's context length

            # Split content into manageable chunks
            chunks = self.split_content(content, max_length)
            embeddings = []

            for chunk in chunks:
                # Generate embeddings for each chunk
                result = self.voyage_client.embed(
                    texts=[chunk],
                    model="voyage-3-lite",
                    input_type="document"
                )
                embeddings.append(result.embeddings[0])

            # Print the number of embeddings generated
            print(f"Generated {len(embeddings)} embeddings")
            return chunks, embeddings

        except Exception as e:
            print(f"Error generating embeddings: {e}")
            return None, None

    def rerank_documents(self, documents: list, query: str) -> list:
        try:
            # Use the Voyager reranker to rank documents based on the query
            result = self.voyage_client.rerank(
                query=query,
                documents=documents,
                model="voyage-3-lite"
            )
            # Sort documents by their scores in descending order
            ranked_documents = sorted(result.documents, key=lambda x: x.score, reverse=True)
            return ranked_documents
        except Exception as e:
            print(f"Error reranking documents: {e}")
            return []

    def generate_response_with_llm(self, query: str, documents: list) -> str:
        try:
            # Prepare the input for the Anthropic LLM
            retrieved_doc = " ".join([doc['content'] for doc in documents])
            prompt = f"Based on the information: '{retrieved_doc}', generate a response for {query}"

            # Use the Anthropic LLM to generate a response
            message = self.anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                max_tokens=1024,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Extract and return the generated response
            return message.content[0].text.strip()
        except Exception as e:
            print(f"Error generating response with LLM: {e}")
            return "I'm sorry, I couldn't generate a response at this time."
