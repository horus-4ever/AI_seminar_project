import os
from dotenv import load_dotenv
from groq import Groq


load_dotenv("C:/Smart/.env")


api_key = os.getenv("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")

print("GROQ KEY FOUND:", api_key[:8] if api_key else None)


client = Groq(
    api_key=api_key
)


def ask_llm(prompt):

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "system",
                "content": "You are an expert chef and nutrition assistant."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0.3
    )

    return response.choices[0].message.content