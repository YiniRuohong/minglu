# Configuration Notes

## Environment Variables

Vercel and production deployments should use the variables in `.env.example`.

- `FORTUNE_BASE_URL`: OpenAI-compatible base URL
- `FORTUNE_API_KEY`: server-side private API key
- `FORTUNE_MODEL`: default private model name
- `FORTUNE_TEMPERATURE`: optional default temperature
- `FORTUNE_HEADERS_JSON`: optional extra headers in JSON string form
- `ACCESS_PASSWORD`: site access password for unlocking the private config

## Local Fallback Files

If the environment variables above are missing during local development, the app can fall back to:

- `config/fortune.config.json`
- `config/access.config.json`

These files are for local development only and should not be committed.

## Visitor-Side Custom Configuration

Users who do not know the site access password can still run the app by saving their own OpenAI-compatible settings in the browser UI:

- Base URL
- API key
- Model name
- Temperature

This visitor configuration is stored only in browser local storage and is not persisted on the server.

## Notes

- `FORTUNE_BASE_URL` will be normalized to end with `/chat/completions`
- `FORTUNE_HEADERS_JSON` must be valid JSON, for example `{"x-foo":"bar"}`
- If `ACCESS_PASSWORD` is not configured, the site can still load, but the private server-side config cannot be unlocked
