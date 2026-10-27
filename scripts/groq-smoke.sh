#!/usr/bin/env bash
set -euo pipefail

: "${GROQ_API_KEY:?GROQ_API_KEY es obligatoria}"

base_url="${GROQ_BASE_URL:-https://api.groq.com/openai/v1}"
base_url="${base_url%/}"
if [[ "$base_url" != */v1 ]]; then
  base_url="${base_url}/v1"
fi
model="${GROQ_CHAT_MODEL:-openai/gpt-oss-20b}"

payload=$(printf '{"model":"%s","messages":[{"role":"user","content":"Responde solo JSON valido: {\\"ok\\":true}"}],"temperature":0}' "$model")

response=$(curl -sS --fail \
  -H "Authorization: Bearer ${GROQ_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$payload" \
  "${base_url}/chat/completions")

printf '%s' "$response" | python3 -m json.tool >/dev/null
printf '%s\n' "$response"
