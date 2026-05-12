import requests
import os
from dotenv import load_dotenv

# Force values from .env so exported shell vars don't override them.
load_dotenv(override=True)

url = "https://www.braintrust.dev/api/actions/getUsageMetrics"

def require_env(name: str) -> str:
  value = os.getenv(name)
  if not value:
    raise ValueError(f"Missing required environment variable: {name}")
  return value.strip().strip("'\"")

API_KEY = require_env("BRAINTRUST_API_KEY")
ORG_ID = require_env("ORG_ID")

headers = {
  "Authorization": f"Bearer {API_KEY}",
  "Content-Type": "application/json",
}

payload = {
  "function_args": {
    "days": 60,
    "orgId": ORG_ID,
  }
}

response = requests.post(url, headers=headers, json=payload)
response.raise_for_status()
print(response.json())