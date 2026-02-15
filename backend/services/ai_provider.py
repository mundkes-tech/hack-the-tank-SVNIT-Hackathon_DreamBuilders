"""
Central Groq (OpenAI-compatible) AI provider utilities.
"""
from __future__ import annotations

import json
import os
from typing import Any, Optional, Tuple

import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


def call_groq_chat(prompt: str, temperature: float = 0.2) -> str:
    """
    Call the Groq chat completions API and return message content.
    """
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY environment variable is not set")

    base_url = GROQ_BASE_URL.rstrip("/")
    url = f"{base_url}/chat/completions"

    payload = {
        "model": GROQ_MODEL,
        "temperature": temperature,
        "messages": [
            {
                "role": "system",
                "content": "You are a precise assistant that returns only valid JSON."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    response = requests.post(url, json=payload, headers=headers, timeout=60)
    if not response.ok:
        raise RuntimeError(
            f"Groq API error: {response.status_code} {response.text[:200]}"
        )

    data = response.json()
    return data["choices"][0]["message"]["content"]


def _strip_code_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def parse_json_from_text(text: str) -> Optional[dict[str, Any]]:
    """
    Attempt to parse JSON from model output.
    Returns None if parsing fails.
    """
    if not text:
        return None

    cleaned = _strip_code_fences(text)

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None

    try:
        return json.loads(cleaned[start:end + 1])
    except json.JSONDecodeError:
        return None


def call_groq_json(prompt: str, temperature: float = 0.2) -> Tuple[Optional[dict[str, Any]], str]:
    """
    Call Groq and parse JSON response.
    Returns (data, raw_text).
    """
    raw_text = call_groq_chat(prompt, temperature=temperature)
    return parse_json_from_text(raw_text), raw_text
