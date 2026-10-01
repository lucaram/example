// Prints the model IDs your Groq key can use (IDs only, never the key). Run: npm run llm:models
const key = process.env.GROQ_API_KEY;
if (!key) {
  console.error('GROQ_API_KEY is not set. Put it in .env (see .env.example).');
  process.exit(1);
}
const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { authorization: `Bearer ${key}` } });
if (!res.ok) {
  console.error(`Groq returned ${res.status}. Check the key at https://console.groq.com/keys`);
  process.exit(1);
}
const { data } = await res.json();
console.log(data.map((m) => m.id).sort().join('\n'));
