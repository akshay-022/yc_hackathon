import re
from typing import List, Dict
import logging
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from urllib.parse import urlparse
import os
import dotenv

dotenv.load_dotenv()
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app_integrations.youtube_file import get_transcript_from_url

logger = logging.getLogger(__name__)

def extract_urls(text: str) -> List[str]:
    """
    Extract all URLs from a given text, including query parameters.
    
    Args:
        text (str): Input text containing URLs
    
    Returns:
        List[str]: List of extracted URLs
    """
    # Pattern matches http/https URLs including query parameters, fragments, etc.
    url_pattern = r'https?://(?:[-\w.@]|(?:%[\da-fA-F]{2})|[/?=&])+(?=\s|\n|$)'
    return re.findall(url_pattern, text)

def setup_selenium_driver():
    """
    Set up and return a configured Selenium WebDriver.
    """
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # Run in headless mode
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920x1080")
    
    driver = webdriver.Chrome(options=chrome_options)
    return driver

def scrape_webpage(url: str) -> str:
    """
    Scrape content from a webpage using Selenium.
    
    Args:
        url (str): URL to scrape
    
    Returns:
        str: Extracted text content
    """
    driver = None
    try:
        driver = setup_selenium_driver()
        driver.get(url)
        
        # Wait for the body to be present
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.TAG_NAME, "body"))
        )
        
        # Remove unnecessary elements
        unwanted_tags = ['script', 'style', 'nav', 'footer', 'header']
        for tag in unwanted_tags:
            elements = driver.find_elements(By.TAG_NAME, tag)
            for element in elements:
                driver.execute_script("""
                    var element = arguments[0];
                    element.parentNode.removeChild(element);
                """, element)
        
        # Get the main content
        # First try to find main content areas
        content_selectors = [
            "article",
            "main",
            ".content",
            "#content",
            ".post-content",
            ".article-content"
        ]
        
        content = ""
        for selector in content_selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    content = " ".join(element.text for element in elements)
                    break
            except:
                continue
        
        # If no content found with specific selectors, get body text
        if not content:
            content = driver.find_element(By.TAG_NAME, "body").text
        
        # Clean up the text
        content = re.sub(r'\s+', ' ', content).strip()
        
        # Replace the URL with the content in the original text
        return content
        
    except Exception as e:
        logger.error(f"Error scraping webpage {url}: {str(e)}")
        return f"Error scraping content: {str(e)}"
    
    finally:
        if driver:
            driver.quit()

def get_complete_content(text: str) -> str:
    """
    Process text to extract and fetch content from all URLs, replacing them with their content.
    
    Args:
        text (str): Input text containing URLs
    
    Returns:
        str: Text with URLs replaced by their content
    """
    try:
        urls = extract_urls(text)
        result_text = text
        
        for url in urls:
            try:
                parsed_url = urlparse(url)
                domain = parsed_url.netloc.lower()
                
                if 'youtube.com' in domain or 'youtu.be' in domain:
                    # Handle YouTube URLs
                    content = get_transcript_from_url(url)
                else:
                    # Handle other URLs with Selenium
                    content = scrape_webpage(url)
                    
                # Replace the URL with its content
                result_text = result_text.replace(url, f"\n\nContent from {url}:\n{content}\n\n")
                
            except Exception as e:
                logger.error(f"Error processing URL {url}: {str(e)}")
                result_text = result_text.replace(url, f"\n\nError processing content from {url}: {str(e)}\n\n")
        
        return result_text
        
    except Exception as e:
        logger.error(f"Error in get_complete_content: {str(e)}")
        return f"Error processing content: {str(e)}"

if __name__ == "__main__":
    # Test the function
    test_text = """
    Check out this video https://www.youtube.com/watch?v=dQw4w9WgXcQ
    And this article https://blog.samaltman.com
    """
    
    result = get_complete_content(test_text)
    print("\nProcessed text:")
    print(result)
