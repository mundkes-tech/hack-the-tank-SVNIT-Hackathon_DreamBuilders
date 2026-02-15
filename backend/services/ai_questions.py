"""
AI Service for generating testimonial interview questions using Groq.
"""
from services.ai_provider import call_groq_json


# Default fallback templates
FALLBACK_QUESTIONS_ENGLISH = {
    "questions": [
        "What problem did you face before using our product or service?",
        "How has using our product improved your experience?",
        "Can you share a specific measurable result or improvement you've seen?",
        "What surprised you most about the experience?",
        "Would you recommend us to others, and why?"
    ]
}

FALLBACK_QUESTIONS_HINDI = {
    "questions": [
        "आप हमारी उत्पाद या सेवा का उपयोग करने से पहले क्या समस्या का सामना करते थे?",
        "हमारी उत्पाद के उपयोग से आपका अनुभव कैसे सुधरा है?",
        "क्या आप कोई विशिष्ट मापने योग्य परिणाम या सुधार साझा कर सकते हैं?",
        "सबसे ज्यादा क्या चीज़ आपको पसंद आई?",
        "क्या आप दूसरों को हमारी सिफारिश करेंगे, और क्यों?"
    ]
}

MIN_QUESTIONS = 3
MAX_QUESTIONS = 5


def validate_questions_format(data: dict) -> bool:
    """
    Validate that the returned data has the correct format.
    Must have 'questions' key with a reasonable number of string questions.
    """
    if not isinstance(data, dict):
        return False
    
    if "questions" not in data:
        return False
    
    questions = data.get("questions")
    if not isinstance(questions, list):
        return False
    
    if not (MIN_QUESTIONS <= len(questions) <= MAX_QUESTIONS):
        return False
    
    # All items must be non-empty strings
    return all(isinstance(q, str) and len(q.strip()) > 0 for q in questions)


def generate_testimonial_questions(prompt: str, language: str = "english") -> dict:
    """
    Generate structured testimonial interview questions using Groq.
    
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
    
    # Construct the prompt for Groq
    groq_prompt = f"""You are a professional interview question generator for testimonial collection.

Given this business context: {prompt}

{lang_instruction}

Generate a concise set of 3-5 testimonial interview questions tailored to this business context.
The questions should be specific to the product or service, not generic.
Cover a natural flow (pain/problem, experience, outcomes, standout moments, recommendation),
but do not force a fixed structure or count.

IMPORTANT: 
- Return ONLY valid JSON with no additional text, no markdown, no numbering
- Do NOT include question numbers
- Format must be exactly:
{{
  "questions": [
        "question 1",
        "question 2"
  ]
}}

Generate natural, conversational questions suitable for video interviews."""
    
    try:
        data, _raw_text = call_groq_json(groq_prompt, temperature=0.3)
        
        # Validate format
        if data and validate_questions_format(data):
            return data
        
        # If parsing or validation failed, return fallback
        print("Warning: Failed to parse Groq response properly. Using fallback template.")
        return fallback
        
    except Exception as e:
        # Log error and return fallback
        print(f"Error calling Groq API: {str(e)}. Using fallback template.")
        return fallback
