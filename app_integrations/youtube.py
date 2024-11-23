from youtube_transcript_api import YouTubeTranscriptApi

def get_video_transcript(video_id: str) -> str:
    """
    Extract transcript from a YouTube video.
    
    Args:
        video_id (str): YouTube video ID (e.g., 'dQw4w9WgXcQ' from 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
    
    Returns:
        str: Full transcript text
    
    Raises:
        TranscriptsDisabled: If transcripts are disabled for the video
        NoTranscriptFound: If no transcript is available
    """
    try:
        # Get the list of transcript dictionaries
        transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
        # Combine all text parts into one string
        transcript_text = ' '.join([entry['text'] for entry in transcript_list])
        return transcript_text

    except Exception as e:
        print(f"Error getting transcript: {str(e)}")
        raise

def extract_video_id(url: str) -> str:
    """
    Extract video ID from YouTube URL.
    
    Args:
        url (str): YouTube video URL
    
    Returns:
        str: Video ID
    """
    try:
        if 'youtu.be' in url:
            return url.split('/')[-1]
        elif 'youtube.com' in url:
            return url.split('v=')[1].split('&')[0]
        else:
            raise ValueError("Invalid YouTube URL")
    except Exception as e:
        print(f"Error extracting video ID: {str(e)}")

def get_transcript_from_url(url: str) -> str:
    """
    Get transcript from YouTube URL.
    
    Args:
        url (str): YouTube video URL
    
    Returns:
        str: Full transcript text
    """
    try:
        video_id = extract_video_id(url)
        return get_video_transcript(video_id)
    except Exception as e:
        print(f"Error getting transcript from URL: {str(e)}")

if __name__ == "__main__":
    # Test URLs - using some popular videos known to have transcripts
    test_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Never Gonna Give You Up
    ]
    
    print("Testing YouTube transcript extraction...")
    print("-" * 50)
    
    for url in test_urls:
        try:
            print(f"\nTesting URL: {url}")
            transcript = get_transcript_from_url(url)
            print("Success! First 150 characters of transcript:")
            print(transcript[:150] + "...")
            
        except Exception as e:
            print(f"Error processing URL: {str(e)}")
    
    # Test invalid URL
    try:
        print("\nTesting invalid URL...")
        invalid_url = "https://youtube.com/invalid"
        get_transcript_from_url(invalid_url)
    except ValueError as e:
        print(f"Successfully caught invalid URL: {str(e)}")
