"""
AI Service for generating testimonial interview questions using Google Gemini.
"""
import json
import os
import google.genai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-1.5-flash"

# Initialize client lazily only when needed
_client = None

def get_genai_client():
    """
    Get or create the Gemini client.
    Raises ValueError if API key is not configured.
    """
    global _client
    if _client is None:
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable is not set")
        _client = genai.Client(api_key=GEMINI_API_KEY)
    return _client


# Default fallback templates
FALLBACK_QUESTIONS_ENGLISH = {
    "questions": [
        "What problem did you face before using our product or service?",
        "How has using our product improved your experience?",
        "Can you share a specific measurable result or improvement you've seen?",
        "Would you recommend us to others, and why?"
    ]
}

FALLBACK_QUESTIONS_HINDI = {
    "questions": [
        "आप हमारी उत्पाद या सेवा का उपयोग करने से पहले क्या समस्या का सामना करते थे?",
        "हमारी उत्पाद के उपयोग से आपका अनुभव कैसे सुधरा है?",
        "क्या आप कोई विशिष्ट मापने योग्य परिणाम या सुधार साझा कर सकते हैं?",
        "क्या आप दूसरों को हमारी सिफारिश करेंगे, और क्यों?"
    ]
}


def clean_gemini_response(response_text: str) -> dict:
    """
    Clean and parse Gemini response to extract valid JSON.
    Handles cases where Gemini might wrap JSON in markdown or add extra text.
    """
    # Remove markdown code blocks if present
    response_text = response_text.strip()
    if response_text.startswith("```json"):
        response_text = response_text[7:]  # Remove ```json
    if response_text.startswith("```"):
        response_text = response_text[3:]  # Remove ```
    if response_text.endswith("```"):
        response_text = response_text[:-3]  # Remove trailing ```
    
    response_text = response_text.strip()
    
    # Try to parse JSON
    try:
        data = json.loads(response_text)
        return data
    except json.JSONDecodeError:
        return None


def validate_questions_format(data: dict) -> bool:
    """
    Validate that the returned data has the correct format.
    Must have 'questions' key with exactly 4 string questions.
    """
    if not isinstance(data, dict):
        return False
    
    if "questions" not in data:
        return False
    
    questions = data.get("questions")
    if not isinstance(questions, list):
        return False
    
    if len(questions) != 4:
        return False
    
    # All items must be non-empty strings
    return all(isinstance(q, str) and len(q.strip()) > 0 for q in questions)


def generate_testimonial_questions(prompt: str, language: str = "english") -> dict:
    """
    Generate 4 structured testimonial interview questions using Google Gemini.
    
    Args:
        prompt: Campaign prompt (e.g., "Collect testimonial for my pizza restaurant")
        language: "english" or "hindi"
    
    Returns:
        dict with "questions" key containing list of 4 questions
    """
    # Validate language
    if language.lower() not in ["english", "hindi"]:
        language = "english"
    
    # Determine fallback based on language
    fallback = (
        FALLBACK_QUESTIONS_HINDI if language.lower() == "hindi" 
        else FALLBACK_QUESTIONS_ENGLISH
    )
    
    # Set language instruction
    if language.lower() == "hindi":
        lang_instruction = "Generate questions in Hindi only. Make them natural spoken language suitable for video interviews."
    else:
        lang_instruction = "Generate questions in English only. Make them natural spoken language suitable for video interviews."
    
    # Construct the prompt for Gemini
    gemini_prompt = f"""You are a professional interview question generator for testimonial collection.

Given this business context: {prompt}

{lang_instruction}

Generate exactly 4 testimonial interview questions that:
1. First question: Ask about a problem they faced before using the product/service
2. Second question: Ask about their experience using the product/service
3. Third question: Ask about a specific measurable result or improvement
4. Fourth question: Ask for their recommendation

IMPORTANT: 
- Return ONLY valid JSON with no additional text, no markdown, no numbering
- Do NOT include question numbers
- Format must be exactly:
{{
  "questions": [
    "question 1",
    "question 2",
    "question 3",
    "question 4"
  ]
}}

Generate natural, conversational questions suitable for video interviews."""
    
    try:
        # Get the Gemini client and call API using new google-genai SDK
        client = get_genai_client()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=gemini_prompt
        )
        
        # Extract and clean response
        response_text = response.text
        data = clean_gemini_response(response_text)
        
        # Validate format
        if data and validate_questions_format(data):
            return data
        
        # If parsing or validation failed, return fallback
        print(f"Warning: Failed to parse Gemini response properly. Using fallback template.")
        return fallback
        
    except Exception as e:
        # Log error and return fallback
        print(f"Error calling Gemini API: {str(e)}. Using fallback template.")
        return fallback
