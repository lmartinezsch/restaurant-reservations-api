# API Examples

This file contains example curl commands and responses for all Restaurant Reservations API endpoints.

## Setup

Ensure the server is running:

```bash
npm run dev
# Server starts on http://localhost:3000 (or PORT=3001 if 3000 is busy)
```

## 1. Check Availability

### Request

```bash
curl "http://localhost:3001/availability?restaurantId=R1&sectorId=S1&date=2025-09-08&partySize=4"
```

### Response (200 OK)

```json
{
  "slotMinutes": 15,
  "durationMinutes": 90,
  "slots": [
    {
      "start": "2025-09-08T15:00:00.000Z",
      "available": true,
      "tables": ["T3", "T4", "T5"]
    },
    {
      "start": "2025-09-08T15:15:00.000Z",
      "available": true,
      "tables": ["T3", "T4", "T5"]
    },
    // ... more slots during lunch (12:00-16:00 ART) and dinner (20:00-00:00 ART)
    {
      "start": "2025-09-08T10:00:00.000Z",
      "available": false,
      "reason": "outside_service_window"
    }
  ]
}
```

## 2. Create Reservation

### Request

```bash
curl -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T13:00:00-03:00",
    "customer": {
      "name": "John Doe",
      "phone": "+54 9 11 5555-1234",
      "email": "john.doe@mail.com"
    },
    "notes": "Anniversary dinner"
  }'
```

### Response (201 Created)

```json
{
  "id": "7c435f25-ab33-425c-a1b6-7b87303e6d3e",
  "restaurantId": "R1",
  "sectorId": "S1",
  "tableIds": ["T3"],
  "partySize": 4,
  "start": "2025-09-08T13:00:00-03:00",
  "end": "2025-09-08T17:30:00.000Z",
  "status": "CONFIRMED",
  "customer": {
    "name": "John Doe",
    "phone": "+54 9 11 5555-1234",
    "email": "john.doe@mail.com",
    "createdAt": "2025-10-24T13:52:50.057Z",
    "updatedAt": "2025-10-24T13:52:50.057Z"
  },
  "notes": "Anniversary dinner",
  "createdAt": "2025-10-24T13:52:50.057Z",
  "updatedAt": "2025-10-24T13:52:50.057Z"
}
```

### Error Responses

#### Outside Service Window (422)

```json
{
  "error": "outside_service_window",
  "detail": "Requested time is outside service window"
}
```

#### No Capacity (409)

```json
{
  "error": "no_capacity",
  "detail": "No available table fits party size at requested time"
}
```

#### Missing Idempotency Key (400)

```json
{
  "error": "validation_error",
  "detail": "Idempotency-Key header is required"
}
```

## 3. List Reservations

### Request (All Sectors)

```bash
curl "http://localhost:3001/reservations/day?restaurantId=R1&date=2025-09-08"
```

### Request (Specific Sector)

```bash
curl "http://localhost:3001/reservations/day?restaurantId=R1&date=2025-09-08&sectorId=S1"
```

### Response (200 OK)

```json
{
  "date": "2025-09-08",
  "items": [
    {
      "id": "7c435f25-ab33-425c-a1b6-7b87303e6d3e",
      "sectorId": "S1",
      "tableIds": ["T3"],
      "partySize": 4,
      "start": "2025-09-08T13:00:00-03:00",
      "end": "2025-09-08T17:30:00.000Z",
      "status": "CONFIRMED",
      "customer": {
        "name": "John Doe",
        "phone": "+54 9 11 5555-1234",
        "email": "john.doe@mail.com",
        "createdAt": "2025-10-24T13:52:50.057Z",
        "updatedAt": "2025-10-24T13:52:50.057Z"
      },
      "notes": "Anniversary dinner",
      "createdAt": "2025-10-24T13:52:50.057Z",
      "updatedAt": "2025-10-24T13:52:50.057Z"
    }
  ]
}
```

## 4. Cancel Reservation

### Request

```bash
curl -X DELETE http://localhost:3001/reservations/7c435f25-ab33-425c-a1b6-7b87303e6d3e
```

### Response

```
204 No Content
```

### Error (Not Found - 404)

```json
{
  "error": "not_found",
  "detail": "Reservation with id xyz not found"
}
```

## Test Scenarios

### Scenario 1: Happy Path

```bash
# 1. Check availability
curl "http://localhost:3001/availability?restaurantId=R1&sectorId=S1&date=2025-09-08&partySize=4"

# 2. Create reservation
curl -X POST http://localhost:3001/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: scenario1-key" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T13:00:00-03:00",
    "customer": {"name": "Alice", "phone": "123", "email": "alice@test.com"}
  }'

# 3. List reservations
curl "http://localhost:3001/reservations/day?restaurantId=R1&date=2025-09-08"

# 4. Cancel reservation
curl -X DELETE http://localhost:3001/reservations/{id}
```

### Scenario 2: Idempotency Test

```bash
# Same idempotency key returns same reservation
curl -X POST http://localhost:3001/reservations -H "Idempotency-Key: same-key" -d '{...}'
curl -X POST http://localhost:3001/reservations -H "Idempotency-Key: same-key" -d '{...}'
# Both return same reservation ID
```

### Scenario 3: Concurrency Test

```bash
# Two simultaneous requests for same slot
curl -X POST http://localhost:3001/reservations -H "Idempotency-Key: key-A" -d '{...}' &
curl -X POST http://localhost:3001/reservations -H "Idempotency-Key: key-B" -d '{...}' &
# One gets 201, the other gets 409
```

### Scenario 4: Capacity Exhaustion

```bash
# Book all 3 tables that fit 4 people (T3, T4, T5)
for i in {1..4}; do
  curl -X POST http://localhost:3001/reservations \
    -H "Idempotency-Key: capacity-$i" \
    -d "{
      \"restaurantId\": \"R1\",
      \"sectorId\": \"S1\",
      \"partySize\": 4,
      \"startDateTimeISO\": \"2025-09-08T13:00:00-03:00\",
      \"customer\": {\"name\": \"Guest $i\", \"phone\": \"123\", \"email\": \"g$i@test.com\"}
    }"
done
# First 3 succeed, 4th gets 409 no_capacity
```
