# Shopping Assistant Voice Proxy

## Objective

Provide text-to-speech for the shopping assistant without exposing the voice provider's API key in the browser. The browser sends the tenant app key using the same `app_key` query-parameter convention as the product search API; the proxy authenticates that app key and calls the voice provider using a secret held only by the proxy.

The proxy is a credential-hiding, tenant-authenticated voice-provider adapter. It must not replace or assume ownership of voice settings supplied by the frontend.

This document covers voice **output** (text-to-speech) only. Voice **input** in the shopping assistant widget (`src/official-widgets/shopping-assistant/use-voice.ts`) does not call this proxy or any other backend — it records and transcribes entirely client-side via the browser's native `SpeechRecognition` / `webkitSpeechRecognition` Web Speech API, then sends the recognized text to the existing chat endpoint like typed input. No audio is uploaded for transcription.

## Request flow

```text
Browser
  │ POST /v1/voice/synthesize/<voiceId>?app_key=<public tenant app key>&placement_id=<placement>&output_format=...
  ▼
Voice Proxy
  ├─ validate origin, app key, payload, quota, and voice policy
  ├─ resolve tenant configuration
  ├─ call the voice provider with server-side secret
  └─ buffer the provider response and return audio/mpeg to the browser
```

The app key is not a secret once it is used by a browser. It identifies the tenant and authorizes only the capabilities and quotas assigned to that tenant. It must not be treated as proof of a trusted end user.

## API contract

### `POST /v1/voice/synthesize/{voiceId}`

The route mirrors the current voice-provider request shape while adding the product-search-style app-key query parameter.

Query parameters:

```text
app_key=<tenant app key>                 required; same convention as product search
placement_id=<placement>                 required; identifies which placement's voice entitlement/quota to charge
output_format=mp3_44100_128              forwarded unchanged to the voice provider; only letters, numbers, `_`, `.`, and `-` are accepted
```

Headers:

```http
Content-Type: application/json
Accept: audio/mpeg
```

The frontend client (`voice-api.ts`) sends only these two headers — there is no client-generated request-id header. Each response carries its own `reqid`, but as a field in the JSON body (error responses only; see below), not as a header.

Request body:

```json
{
  "text": "Here is a great option for you.",
  "model_id": "eleven_multilingual_v2",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

The proxy forwards the `{voiceId}` path segment, `output_format` query parameter, and JSON body fields to the voice provider. In particular, it must not inject, replace, default, clamp, or reinterpret `model_id` or `voice_settings`.

The proxy itself must not default these fields, but the frontend does apply its own defaults before calling the proxy when a widget customization doesn't override them (see `src/official-widgets/shopping-assistant/voice-api.ts`): voice ID `21m00Tcm4TlvDq8ikWAM`, model `eleven_multilingual_v2`, stability `0.5`, similarity boost `0.75`.

Request rules:

| Field | Required | Rule |
|---|---:|---|
| `app_key` | yes | Authenticates the tenant using the same query-parameter mechanism as product search; never forward it to the voice provider |
| `placement_id` | yes | Identifies which placement is making the request, for the placement-level voice gate and quota accounting; reject if it doesn't belong to the authenticated tenant; never forward it to the voice provider |
| `{voiceId}` | yes | Forward unchanged to the voice provider's voice path; do not select a server-side default |
| `output_format` | yes | Reject anything outside letters, numbers, `_`, `.`, and `-`; otherwise forward unchanged to the voice provider |
| `text` | yes | UTF-8 string; reject empty text and enforce a hard safety limit (currently 2000 characters, see `VOICE_PROXY_MAX_TEXT_CHARS`); otherwise forward unchanged |
| `model_id` | yes | Forward unchanged; the proxy does not select the model |
| `voice_settings` | yes | Forward unchanged; the proxy does not own stability, similarity, style, or other provider settings |

The proxy may validate encoding, size, and JSON shape, but must not rewrite the text or provider settings before forwarding them. Any speech sanitization remains the frontend's responsibility.

Successful response:

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Cache-Control: no-store
Content-Length: <when known>
```

The response body is the audio bytes. The current implementation buffers the full provider response and returns it in one shot — it is not a progressive/chunked stream, so the frontend cannot start playback before the whole clip has arrived. A future iteration could stream provider bytes through as they arrive, but nothing in the frontend client depends on that today; it always does `response.blob()` on the whole body.

### Error response

The implemented endpoint does **not** use a bespoke voice-specific error shape. Almost all non-2xx responses reuse the same standard Product Search error wrapper as every other product-search endpoint — `error.code` is a numeric code shared with the rest of product search, not a string enum, and the request id is a top-level `reqid` field, not nested inside `error`:

```json
{
  "reqid": "019fb8cef2fb41c3d7620e224dbb58",
  "status": "fail",
  "method": "voice/synthesize",
  "error": {
    "code": 413,
    "message": "Voice synthesis text is too large."
  }
}
```

This applies to authentication failures reaching the standard logging/error path too, e.g. an invalid `app_key`:

```json
{
  "reqid": "019fb8cef2fb41c3d7620e224dbb58",
  "status": "fail",
  "method": "voice/synthesize",
  "error": {
    "code": 100,
    "message": "Unauthorized."
  }
}
```

An invalid or mismatched `placement_id` returns the standard placement error, reusing the same `112` code product search already uses for a bad `placement_id` elsewhere:

```json
{
  "reqid": "019fb8cef2fb41c3d7620e224dbb58",
  "status": "fail",
  "method": "voice/synthesize",
  "error": {
    "code": 112,
    "message": "Parameter 'placement_id' is invalid."
  }
}
```

HTTP statuses actually in use:

| HTTP Status | Meaning |
| --- | --- |
| `400` | Invalid request shape, missing body fields, blank `voiceId`, blank/unsafe `output_format`, or a missing/invalid `placement_id` (error code `112`) |
| `401` | Missing or invalid `app_key` (error code `100`) |
| `429` | Account or client IP exceeded the configured voice synthesis QPS limit |
| `413` | `text` exceeds the configured maximum length |
| `502` | Voice provider request failed |
| `503` | Voice proxy is disabled or the server-side voice-provider key is unavailable |
| `504` | Voice provider request timed out |

There is no separate `403 VOICE_NOT_ALLOWED` status in the implemented contract — a tenant/placement that isn't entitled to voice is expected to be handled by `voiceEnabled` never being set for that placement (see [Tenant authentication and authorization](#tenant-authentication-and-authorization)), not by a distinct error code returned per-request.

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

## Known frontend client behavior

The shopping assistant widget's client (`src/official-widgets/shopping-assistant/voice-api.ts`, `use-voice.ts`) already builds in resilience the proxy should not need to duplicate, but that's useful context when reasoning about traffic patterns and failure handling:

- Requests are cancellable via `AbortSignal` — the widget aborts an in-flight or queued synthesis call whenever the user starts a new recording or otherwise interrupts a reply. Expect aborted connections; they are not client bugs.
- On any synthesis failure (network error, non-2xx response, timeout), the client silently falls back to the browser's on-device `SpeechSynthesisUtterance` so the reply is still narrated, just without the cloned voice. It does not retry the proxy itself.
- The client sanitizes reply text (stripping markdown bold markers, list bullets/numbering, collapsing whitespace) via `sanitizeTextForSpeech` before sending it as `text`. The proxy should not assume it needs to do this, but also should not assume `text` is always clean prose from every possible caller.

## Security and abuse controls

- TLS everywhere; reject plaintext production traffic.
- Never put the voice-provider key in HTML, JavaScript, config responses, logs, traces, analytics, or error messages.
- Redact app keys, authorization material, and synthesized text from normal logs.
- Enforce body size, character count, request timeout, concurrency, per-minute rate, and monthly quota limits.
- Use a bounded request body parser; reject compressed request bombs if compression is enabled.
- Configure CORS from the tenant's allowed-origin list; never use unrestricted `*` with credentials.
- Consider a signed short-lived browser token later if app-key abuse becomes material. This is additive and should not be required for the first version.

## Observability

Every request receives a generated request ID and returns it as `reqid` in the error JSON (there is no successful-response equivalent, since a 200 response body is raw audio bytes, not JSON). Record structured metrics without recording full text:

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
