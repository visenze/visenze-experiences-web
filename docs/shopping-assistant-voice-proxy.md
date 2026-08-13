# Shopping Assistant Voice Proxy

## Objective

Provide text-to-speech for the shopping assistant without exposing the voice provider's API key in the browser. The browser sends the tenant app key using the same `app_key` query-parameter convention as the product search API; the proxy authenticates that app key and calls the voice provider using a secret held only by the proxy.

The proxy is a credential-hiding, tenant-authenticated voice-provider adapter. It must not replace or assume ownership of voice settings supplied by the frontend.

## Request flow

```text
Browser
  │ POST /v1/voice/synthesize/<voice_id>?app_key=<public tenant app key>&placement_id=<placement>&output_format=...
  ▼
Voice Proxy
  ├─ validate origin, app key, payload, quota, and voice policy
  ├─ resolve tenant configuration
  ├─ call the voice provider with server-side secret
  └─ stream audio/mpeg back to browser
```

The app key is not a secret once it is used by a browser. It identifies the tenant and authorizes only the capabilities and quotas assigned to that tenant. It must not be treated as proof of a trusted end user.

## API contract

### `POST /v1/voice/synthesize/{voice_id}`

The route mirrors the current voice-provider request shape while adding the product-search-style app-key query parameter.

Query parameters:

```text
app_key=<tenant app key>                 required; same convention as product search
placement_id=<placement>                 required; identifies which placement's voice entitlement/quota to charge
output_format=mp3_44100_128              forwarded unchanged to the voice provider
```

Headers:

```http
Content-Type: application/json
Accept: audio/mpeg
X-Request-Id: <optional client-generated id>
```

Request body:

```json
{
  "text": "Here is a great option for you.",
  "model_id": "multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

The proxy forwards the `{voice_id}` path segment, `output_format` query parameter, and JSON body fields to the voice provider. In particular, it must not inject, replace, default, clamp, or reinterpret `model_id` or `voice_settings`.

Request rules:

| Field | Required | Rule |
|---|---:|---|
| `app_key` | yes | Authenticates the tenant using the same query-parameter mechanism as product search; never forward it to the voice provider |
| `placement_id` | yes | Identifies which placement is making the request, for the placement-level voice gate and quota accounting; reject if it doesn't belong to the authenticated tenant; never forward it to the voice provider |
| `{voice_id}` | yes | Forward unchanged to the voice provider's voice path; do not select a server-side default |
| `output_format` | yes | Forward unchanged to the voice provider; reject only malformed or disallowed provider syntax required for safe URL construction |
| `text` | yes | UTF-8 string; reject empty text and enforce a hard safety limit; otherwise forward unchanged |
| `model_id` | yes | Forward unchanged; the proxy does not select the model |
| `voice_settings` | yes | Forward unchanged; the proxy does not own stability, similarity, style, or other provider settings |

The proxy may validate encoding, size, and JSON shape, but must not rewrite the text or provider settings before forwarding them. Any speech sanitization remains the frontend's responsibility.

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Content-Length: <when known>
Cache-Control: no-store
X-Request-Id: <proxy request id>
X-Voice-Provider: <provider name>
```

The response body is the audio bytes. Streaming the provider response is preferred; buffering is acceptable for the first implementation if an explicit maximum response size is enforced.

### Error response

All non-2xx responses use one stable JSON shape:

```json
{
  "error": {
    "code": "VOICE_QUOTA_EXCEEDED",
    "message": "Voice synthesis quota exceeded.",
    "request_id": "req_01J..."
  }
}
```

Recommended status and codes:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `INVALID_REQUEST` | Malformed JSON, empty text, unsupported format, or text too long |
| 401 | `INVALID_APP_KEY` | Missing, unknown, revoked, or inactive app key |
| 403 | `VOICE_NOT_ALLOWED` | Tenant is not enabled for voice or requested voice is not allowed |
| 413 | `TEXT_TOO_LARGE` | Payload exceeds the configured hard limit |
| 429 | `VOICE_RATE_LIMITED` / `VOICE_QUOTA_EXCEEDED` | Per-tenant rate or usage limit exceeded; include `Retry-After` for rate limits |
| 502 | `VOICE_PROVIDER_ERROR` | The voice provider returned an upstream failure |
| 504 | `VOICE_PROVIDER_TIMEOUT` | Provider did not respond within the proxy timeout |
| 503 | `VOICE_UNAVAILABLE` | Proxy or provider temporarily unavailable |

Do not return voice-provider API keys, raw upstream error bodies, or internal configuration in client errors.

## Tenant authentication and authorization

1. Extract the `app_key` and `placement_id` query parameters using the same request handling and tenant lookup as the product search API; do not log their values.
2. Look up the app key in the tenant registry using the same validation path as product search, and confirm `placement_id` belongs to that tenant.
3. Verify status, allowed origins/domains, per-placement voice entitlement, and quota.
4. Resolve the voice-provider credential from server-side secret configuration. The browser never supplies it.
5. Apply rate and usage limits before making the provider call.

Origin and `Referer` checks are useful abuse friction but are not authentication. The service must still enforce quotas and tenant authorization because browser headers can be forged outside a browser.

Suggested tenant record:

```json
{
  "app_key_hash": "...",
  "tenant_id": "tenant_123",
  "status": "active",
  "allowed_origins": ["https://shop.example.com"],
  "voice_enabled": true,
  "max_chars_per_request": 2000,
  "requests_per_minute": 30,
  "monthly_character_quota": 100000
}
```

## Provider integration

The provider adapter should be isolated behind an interface such as:

```ts
interface SpeechProvider {
  synthesize(input: {
    text: string;
    voiceId: string;
    outputFormat: string;
    modelId: string;
    voiceSettings: Record<string, unknown>;
    requestId: string;
  }): Promise<{ body: ReadableStream; contentType: string }>;
}
```

The voice-provider adapter maps the interface to the provider request exactly:

- `POST ${VOICE_PROVIDER_BASE_URL}/v1/text-to-speech/{voiceId}?output_format={outputFormat}`
- `<provider auth header>: <server-side secret>`
- JSON body `{ text, model_id: modelId, voice_settings: voiceSettings }`

The only provider credential/configuration owned by the proxy is:

- voice-provider API key from a secret manager or runtime secret
- provider base URL
- timeout, maximum response bytes, and retry policy

Retry only transient failures and only before audio bytes are sent. Do not blindly retry provider `4xx` responses or a request after partial audio has reached the client.

## Security and abuse controls

- TLS everywhere; reject plaintext production traffic.
- Never put the voice-provider key in HTML, JavaScript, config responses, logs, traces, analytics, or error messages.
- Redact app keys, authorization material, and synthesized text from normal logs.
- Enforce body size, character count, request timeout, concurrency, per-minute rate, and monthly quota limits.
- Use a bounded request body parser; reject compressed request bombs if compression is enabled.
- Configure CORS from the tenant's allowed-origin list; never use unrestricted `*` with credentials.
- Consider a signed short-lived browser token later if app-key abuse becomes material. This is additive and should not be required for the first version.

## Observability

Every request receives a generated request ID and returns it in `X-Request-Id` and error JSON. Record structured metrics without recording full text:

- tenant ID and route
- provider latency and total latency
- input character count bucket
- voice ID and model ID
- status/error code
- provider retry count
- quota/rate-limit decisions

Alert on elevated provider failures, timeout rate, quota anomalies, and unexpected spend. Keep detailed payload logging disabled by default; if temporary debugging is required, use explicit redaction and a short retention period.

## Deployment configuration

Required runtime configuration:

```text
VOICE_PROVIDER_API_KEY             # secret manager reference, never client config
VOICE_PROVIDER_BASE_URL            # voice provider's API base URL
VOICE_PROXY_MAX_TEXT_CHARS         # default 2000
VOICE_PROXY_TIMEOUT_MS             # recommended 15000
VOICE_PROXY_MAX_RESPONSE_BYTES     # bounded safety limit
TENANT_REGISTRY_URL or database     # app-key and policy lookup
```

Use separate provider credentials and tenant registries for development, staging, and production. Rotate the provider key without rebuilding or redeploying the frontend.

## Rollout plan

1. Build the proxy with a mock provider adapter and contract tests.
2. Add a voice-provider adapter behind the same interface and test provider failures, timeouts, and oversized responses.
3. Deploy behind a versioned path, for example `/v1/voice/synthesize`, with one staging tenant and strict low quotas.
4. Verify CORS, app-key revocation, quota accounting, secret scanning, and spend alerts.
5. Only then update the frontend client to call the proxy with the app key and remove the voice-provider key from widget configuration.

## Acceptance criteria

- No browser bundle, network response, or client-visible configuration contains the voice-provider API key.
- Valid active app keys receive audio from the configured tenant voice.
- Invalid, revoked, unauthorized, over-limit, and provider-failure cases return the documented error shape.
- The same request ID can be traced across proxy logs and provider metrics without logging user text.
- Contract tests cover CORS, quotas, exact provider-payload forwarding, provider errors, timeout behavior, and response content type.
