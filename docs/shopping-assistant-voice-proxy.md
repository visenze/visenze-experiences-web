# Shopping Assistant Voice API

## Objective

Provide text-to-speech for the shopping assistant. The frontend authenticates with the existing Product Search `app_key` and `placement_id`, the same as the other Product Search APIs.

## Request flow

```text
Browser
  │ POST /v1/voice/synthesize/{voiceId}?app_key={appKey}&placement_id={placementId}&output_format={outputFormat}
  ▼
Voice Proxy
  ├─ validate origin, app key, payload, quota, and voice policy
  ├─ resolve tenant configuration
  ├─ call the voice provider
  └─ stream audio/mpeg back to browser
```

## Endpoint

```http
POST /v1/voice/synthesize/{voiceId}?app_key={appKey}&placement_id={placementId}&output_format={outputFormat}
Content-Type: application/json
Accept: audio/mpeg
```

### Path Parameters

| Name | Required | Description |
| --- | --- | --- |
| `voiceId` | Yes | voice ID to synthesize with. |

### Query Parameters

| Name | Required | Description |
| --- | --- | --- |
| `app_key` | Yes | Existing Product Search app key. |
| `placement_id` | Yes | Existing Product Search placement ID. Must be an active placement belonging to the app the `app_key` resolves to. |
| `output_format` | Yes | output format, for example `mp3_44100_128`. Only letters, numbers, `_`, `.`, and `-` are accepted. |

## Request Body

```json
{
  "text": "Here is a great option for you.",
  "model_id": "<modelId>",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

| Field | Required | Description |
| --- | --- | --- |
| `text` | Yes | Text to convert to speech. Current server limit is 2000 characters. |
| `model_id` | Yes | voice model ID. |
| `voice_settings` | Yes | voice settings. |

## Successful Response

```http
HTTP/1.1 200 OK
Content-Type: audio/mpeg
Cache-Control: no-store
Content-Length: 12345

<binary mp3 bytes>
```

The response body is raw audio bytes, not JSON. The frontend should treat it as a binary blob.

## Error Responses

Most application errors use the standard Product Search error shape:

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

For authentication failures, the same wrapper is used when the request reaches the standard Product Search logging/error path:

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

An invalid or mismatched `placement_id` returns the standard placement error:

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

Common statuses:

| HTTP Status | Meaning |
| --- | --- |
| `400` | Invalid request shape, missing body fields, blank `voiceId`, blank or unsafe `output_format`, or missing/invalid `placement_id` (error code `112`). |
| `401` | Missing or invalid `app_key`. |
| `429` | Account or client IP exceeded the configured voice synthesis QPS limit. |
| `413` | `text` exceeds the configured maximum length. |
| `502` | Voice provider request failed. |
| `503` | Voice proxy is disabled. |
| `504` | Voice provider request timed out. |

## cURL Example

```bash
curl -v \
  -H 'Content-Type: application/json' \
  -H 'Accept: audio/mpeg' \
  'https://<product-search-host>/v1/voice/synthesize/<voice-id>?app_key=<app-key>&placement_id=<placement-id>&output_format=mp3_44100_128' \
  --data '{"text":"Here is a great option for you.","model_id":"<modelId>","voice_settings":{"stability":0.5,"similarity_boost":0.75}}' \
  --output voice-proxy-test.mp3
```
