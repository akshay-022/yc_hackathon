from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# Access the environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

# Debugging: Print the environment variables
print(f"Supabase URL: {supabase_url}")
print(f"Supabase Key: {supabase_key}")