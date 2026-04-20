import os
import json
from typing import Dict, Any, Optional
from ai.json_extract import extract_first_json_object

class GroqService:
    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = model or os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.client = None

        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
                print("✅ Groq initialized for LifeLineAI")
            except Exception as e:
                print(f"⚠️ Groq init failed: {e}")
                self.client = None
        else:
            print("⚠️ No GROQ_API_KEY set. LLM features will fallback.")

    def chat_json(self, prompt: str, payload: Dict[str, Any], temperature: float = 0.2, max_tokens: int = 900) -> Dict[str, Any]:
        if not self.client:
            raise RuntimeError("Groq client not available")

        user_content = (
            "Return ONLY valid JSON. No markdown. No code fences. No extra text.\n\n"
            f"{prompt}\n\n"
            f"INPUT_JSON:\n{json.dumps(payload, ensure_ascii=False)}"
        )

        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": user_content}],
            temperature=temperature,
            max_tokens=max_tokens,
        )

        text = resp.choices[0].message.content.strip()
        return extract_first_json_object(text)