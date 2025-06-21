# API Reference

The Flash API provides programmatic access to initiate and manage cross-border payments using the Aptos blockchain. This document outlines the available endpoints, authentication mechanisms, and expected request/response formats.

## Base URL

**Production**: `https://api.flash.com/v1`  
**Sandbox**: `https://sandbox-api.flash.com/v1`

## Authentication

Flash uses OAuth 2.0 with JWT tokens for API authentication.

### Obtaining Access Tokens

```
POST /auth/token
```

#### Request

```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "grant_type": "client_credentials",
  "scope": "payments:read payments:write"
}
```

#### Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "def50200641f3e...",
  "scope": "payments:read payments:write"
}
```

### Using Access Tokens

Include the access token in the `Authorization` header for all API requests:

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Refresh

```
POST /auth/refresh
```

#### Request

```json
{
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "grant_type": "refresh_token",
  "refresh_token": "def50200641f3e..."
}
```

#### Response

Same as token issuance response.

## Payments API

### Create Payment

```
POST /payments
```

Initiates a new cross-border payment.

#### Request

```json
{
  "source": {
    "currency": "USD",
    "amount": 1000.0
  },
  "destination": {
    "currency": "EUR",
    "recipient": {
      "type": "wallet_address",
      "address": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  },
  "execution": {
    "mode": "immediate", // or "optimal"
    "urgency": "standard" // or "express"
  },
  "reference": "INV-12345",
  "metadata": {
    "customer_id": "cust_12345",
    "department": "marketing"
  }
}
```

#### Response

```json
{
  "id": "pmt_01FGEH8JNZV9A7D8QT3R6KM4NP",
  "status": "processing",
  "created_at": "2023-05-15T12:34:56Z",
  "updated_at": "2023-05-15T12:34:56Z",
  "source": {
    "currency": "USD",
    "amount": 1000.0
  },
  "destination": {
    "currency": "EUR",
    "estimated_amount": 920.45,
    "recipient": {
      "type": "wallet_address",
      "address": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  },
  "execution": {
    "mode": "immediate",
    "urgency": "standard",
    "estimated_completion_time": "2023-05-15T12:35:10Z"
  },
  "exchange_rate": {
    "rate": 0.9205,
    "guaranteed": true,
    "expiry": "2023-05-15T12:39:56Z"
  },
  "fee": {
    "amount": 3.5,
    "currency": "USD"
  },
  "transactions": [
    {
      "id": "txn_01FGEH8JNZ1234",
      "type": "blockchain",
      "status": "pending",
      "hash": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    }
  ],
  "reference": "INV-12345",
  "metadata": {
    "customer_id": "cust_12345",
    "department": "marketing"
  }
}
```

### Get Payment

```
GET /payments/{payment_id}
```

Retrieves details of an existing payment.

#### Response

Same format as the create payment response, with updated status and transaction information.

### List Payments

```
GET /payments
```

Retrieves a list of payments based on filter criteria.

#### Query Parameters

| Parameter        | Type     | Description                                                       |
| ---------------- | -------- | ----------------------------------------------------------------- |
| `status`         | string   | Filter by payment status (e.g., "pending", "completed", "failed") |
| `created_after`  | ISO date | Filter payments created after this timestamp                      |
| `created_before` | ISO date | Filter payments created before this timestamp                     |
| `reference`      | string   | Filter by reference                                               |
| `limit`          | integer  | Maximum number of results (default: 20, max: 100)                 |
| `cursor`         | string   | Pagination cursor from previous response                          |

#### Response

```json
{
  "data": [
    {
      "id": "pmt_01FGEH8JNZV9A7D8QT3R6KM4NP",
      "status": "completed",
      "created_at": "2023-05-15T12:34:56Z",
      "updated_at": "2023-05-15T12:35:22Z",
      "source": {
        "currency": "USD",
        "amount": 1000.0
      },
      "destination": {
        "currency": "EUR",
        "amount": 920.45,
        "recipient": {
          "type": "wallet_address",
          "address": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        }
      }
      // ... additional payment details
    }
    // ... more payments
  ],
  "pagination": {
    "next_cursor": "MTIzNDU2Nzg5MA==",
    "has_more": true
  }
}
```

### Cancel Payment

```
POST /payments/{payment_id}/cancel
```

Attempts to cancel a pending payment.

#### Response

```json
{
  "id": "pmt_01FGEH8JNZV9A7D8QT3R6KM4NP",
  "status": "cancelling"
  // ... other payment details
}
```

## Exchange Rates API

### Get Current Exchange Rate

```
GET /rates
```

Retrieves current exchange rates for a currency pair.

#### Query Parameters

| Parameter              | Type   | Description                                   |
| ---------------------- | ------ | --------------------------------------------- |
| `source_currency`      | string | Source currency code (e.g., "USD")            |
| `destination_currency` | string | Destination currency code (e.g., "EUR")       |
| `amount`               | number | Optional. Amount to convert for precise quote |

#### Response

```json
{
  "source_currency": "USD",
  "destination_currency": "EUR",
  "rate": 0.9205,
  "inverse_rate": 1.0864,
  "amount": 1000.0,
  "converted_amount": 920.5,
  "timestamp": "2023-05-15T12:34:56Z",
  "expiry": "2023-05-15T12:39:56Z"
}
```

### Get Historical Exchange Rates

```
GET /rates/history
```

Retrieves historical exchange rates for a currency pair.

#### Query Parameters

| Parameter              | Type     | Description                             |
| ---------------------- | -------- | --------------------------------------- |
| `source_currency`      | string   | Source currency code (e.g., "USD")      |
| `destination_currency` | string   | Destination currency code (e.g., "EUR") |
| `start_date`           | ISO date | Start date for historical data          |
| `end_date`             | ISO date | End date for historical data            |
| `interval`             | string   | Data interval ("hour", "day", "week")   |

#### Response

```json
{
  "source_currency": "USD",
  "destination_currency": "EUR",
  "interval": "day",
  "rates": [
    {
      "timestamp": "2023-05-01T00:00:00Z",
      "rate": 0.9195
    },
    {
      "timestamp": "2023-05-02T00:00:00Z",
      "rate": 0.921
    }
    // ... more historical rates
  ]
}
```

## Merchant API

### Get Merchant Profile

```
GET /merchants/profile
```

Retrieves the merchant profile information.

#### Response

```json
{
  "id": "merch_01FGEH8JNZV9A7D",
  "name": "Acme Corporation",
  "email": "payments@acme.com",
  "status": "active",
  "created_at": "2023-01-15T10:20:30Z",
  "verification_status": "verified",
  "settlement_currencies": ["USD", "EUR", "GBP"],
  "settings": {
    "auto_convert": true,
    "default_settlement_currency": "USD",
    "webhook_url": "https://acme.com/webhooks/flash"
  }
}
```

### Get Balances

```
GET /merchants/balances
```

Retrieves current balances for all currencies.

#### Response

```json
{
  "balances": [
    {
      "currency": "USD",
      "amount": 24580.5,
      "available": 24580.5,
      "pending": 0.0
    },
    {
      "currency": "EUR",
      "amount": 15420.75,
      "available": 15000.0,
      "pending": 420.75
    }
    // ... more currencies
  ]
}
```

### Configure Webhook

```
POST /merchants/webhook
```

Configures the webhook URL for receiving payment notifications.

#### Request

```json
{
  "url": "https://example.com/webhooks/flash",
  "events": ["payment.created", "payment.completed", "payment.failed"],
  "secret": "whsec_1234567890abcdefghijklmnopqrstuvwxyz"
}
```

#### Response

```json
{
  "webhook_id": "whk_01FGEH8JNZV9A7D",
  "url": "https://example.com/webhooks/flash",
  "events": ["payment.created", "payment.completed", "payment.failed"],
  "status": "active",
  "created_at": "2023-05-15T12:34:56Z"
}
```

## AI Routing API

### Get Optimal Route

```
GET /routes/optimal
```

Retrieves the optimal payment route for a given currency pair and amount.

#### Query Parameters

| Parameter              | Type   | Description                              |
| ---------------------- | ------ | ---------------------------------------- |
| `source_currency`      | string | Source currency code (e.g., "USD")       |
| `destination_currency` | string | Destination currency code (e.g., "EUR")  |
| `amount`               | number | Amount to transfer                       |
| `priority`             | string | "speed", "cost", or "balanced" (default) |

#### Response

```json
{
  "source": {
    "currency": "USD",
    "amount": 1000.0
  },
  "destination": {
    "currency": "BRL",
    "estimated_amount": 4985.25
  },
  "optimal_route": {
    "path": [
      {
        "stage": 1,
        "from": "USD",
        "to": "USDC",
        "platform": "Circle",
        "estimated_time_seconds": 15,
        "estimated_fee": 0.5
      },
      {
        "stage": 2,
        "from": "USDC",
        "to": "USDC",
        "platform": "Aptos Network",
        "estimated_time_seconds": 0.65,
        "estimated_fee": 0.001
      },
      {
        "stage": 3,
        "from": "USDC",
        "to": "BRL",
        "platform": "LocalPartnerExchange",
        "estimated_time_seconds": 5,
        "estimated_fee": 2.5
      }
    ],
    "total_estimated_time_seconds": 20.65,
    "total_estimated_fee_usd": 3.001,
    "confidence_score": 0.97
  },
  "alternatives": [
    {
      "route_id": "route_2",
      "total_estimated_time_seconds": 35.5,
      "total_estimated_fee_usd": 2.85,
      "confidence_score": 0.92,
      "reason_not_selected": "slower_settlement"
    },
    {
      "route_id": "route_3",
      "total_estimated_time_seconds": 18.2,
      "total_estimated_fee_usd": 4.75,
      "confidence_score": 0.88,
      "reason_not_selected": "higher_cost"
    }
  ]
}
```

### Get FX Timing Prediction

```
GET /predictions/fx-timing
```

Retrieves AI-powered predictions for optimal FX timing.

#### Query Parameters

| Parameter              | Type   | Description                                  |
| ---------------------- | ------ | -------------------------------------------- |
| `source_currency`      | string | Source currency code (e.g., "USD")           |
| `destination_currency` | string | Destination currency code (e.g., "EUR")      |
| `amount`               | number | Amount to transfer                           |
| `time_horizon`         | string | "short" (15min), "medium" (4h), "long" (24h) |

#### Response

```json
{
  "source_currency": "USD",
  "destination_currency": "EUR",
  "amount": 10000.0,
  "current_rate": 0.9205,
  "current_converted_amount": 9205.0,
  "prediction": {
    "recommended_action": "wait",
    "expected_best_rate": 0.9245,
    "expected_best_time": "2023-05-15T16:45:00Z",
    "potential_savings": 40.0,
    "confidence": 0.78,
    "expiry": "2023-05-15T13:30:00Z"
  },
  "forecast": [
    {
      "timestamp": "2023-05-15T13:00:00Z",
      "predicted_rate": 0.921,
      "confidence_interval": [0.9195, 0.9225]
    },
    {
      "timestamp": "2023-05-15T14:00:00Z",
      "predicted_rate": 0.9225,
      "confidence_interval": [0.9205, 0.9245]
    }
    // ... more forecast points
  ]
}
```

## Webhook Events

Flash sends webhook notifications for various events. Each notification includes a signature header for verification.

### Verification

Webhooks include an `X-Flash-Signature` header with an HMAC signature calculated using your webhook secret:

```
X-Flash-Signature: t=1684148096,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
```

To verify the signature:

1. Extract the timestamp (`t`) and signature (`v1`) from the header
2. Concatenate the timestamp, a period, and the raw request body: `{timestamp}.{body}`
3. Compute an HMAC with SHA-256 using your webhook secret
4. Compare the computed signature with the one in the header

### Event Types

| Event Type           | Description                             |
| -------------------- | --------------------------------------- |
| `payment.created`    | A new payment has been created          |
| `payment.processing` | Payment is being processed              |
| `payment.completed`  | Payment has been completed successfully |
| `payment.failed`     | Payment processing has failed           |
| `payment.cancelled`  | Payment has been cancelled              |

### Event Structure

```json
{
  "id": "evt_01FGEH8JNZV9A7D",
  "type": "payment.completed",
  "created_at": "2023-05-15T12:35:22Z",
  "data": {
    "id": "pmt_01FGEH8JNZV9A7D8QT3R6KM4NP",
    "status": "completed"
    // ... full payment object as per GET /payments/{id} response
  }
}
```

## Error Handling

Flash API uses standard HTTP status codes and returns detailed error information in the response body.

### Error Response Format

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "parameter_invalid",
    "message": "The 'amount' parameter must be greater than zero.",
    "param": "amount",
    "request_id": "req_01FGEH8JNZV9A7D"
  }
}
```

### Common Error Types

| Error Type              | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `authentication_error`  | Issues with API keys or authentication tokens                     |
| `invalid_request_error` | Malformed requests or invalid parameters                          |
| `rate_limit_error`      | Too many requests made in a given time period                     |
| `api_error`             | Unexpected server errors                                          |
| `resource_error`        | Issues with requested resources (not found, already exists, etc.) |

### Common HTTP Status Codes

| Status Code | Description                                                |
| ----------- | ---------------------------------------------------------- |
| 200         | OK - The request succeeded                                 |
| 201         | Created - A new resource was created                       |
| 400         | Bad Request - The request was malformed                    |
| 401         | Unauthorized - Authentication failed                       |
| 403         | Forbidden - The authenticated user lacks permission        |
| 404         | Not Found - The requested resource was not found           |
| 409         | Conflict - The request conflicts with the current state    |
| 422         | Unprocessable Entity - Validation failed                   |
| 429         | Too Many Requests - Rate limit exceeded                    |
| 500         | Internal Server Error - Something went wrong on the server |

## Rate Limits

Flash implements rate limiting to protect the API from abuse. Rate limits are applied per API key and vary by endpoint.

Rate limit headers are included in all API responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1684148156
```

If you exceed the rate limit, you'll receive a 429 Too Many Requests response with a Retry-After header indicating when you can retry.

## Sandbox Environment

The sandbox environment provides a testing ground with simulated responses. To use the sandbox:

1. Register for a sandbox account at [https://dashboard.flash.com/sandbox/register](https://dashboard.flash.com/sandbox/register)
2. Use the sandbox API base URL: `https://sandbox-api.flash.com/v1`
3. Use the provided sandbox API credentials

### Sandbox Test Accounts

| Currency | Address    | Initial Balance |
| -------- | ---------- | --------------- |
| USDC     | 0xsandbox1 | 10,000 USDC     |
| USDT     | 0xsandbox2 | 10,000 USDT     |
| EUR      | 0xsandbox3 | 10,000 EUR      |

### Sandbox Test Cards

| Card Number         | Behavior                |
| ------------------- | ----------------------- |
| 4242 4242 4242 4242 | Always succeeds         |
| 4000 0000 0000 0002 | Always fails            |
| 4000 0000 0000 9995 | Requires authentication |

## Versioning

The Flash API is versioned via the URL path. The current version is `v1`. When significant changes are made, a new version will be introduced, and the previous version will remain supported for at least 12 months after deprecation notice.

## SDK Support

Flash provides official SDKs for the following languages:

- JavaScript/TypeScript: [GitHub](https://github.com/flash/flash-js)
- Python: [GitHub](https://github.com/flash/flash-python)
- Java: [GitHub](https://github.com/flash/flash-java)
- PHP: [GitHub](https://github.com/flash/flash-php)

## Support

For API support, contact [api@flash.com](mailto:api@flash.com) or visit the [developer forum](https://developers.flash.com/forum).
