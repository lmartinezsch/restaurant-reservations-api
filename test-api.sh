#!/bin/bash

# Restaurant Reservations API Test Suite
# Demonstrates all core features

BASE_URL="http://localhost:3001"
echo "🧪 Restaurant Reservations API Test Suite"
echo "=================================="
echo ""

# Test 1: Check Availability
echo "✅ Test 1: Check Availability for party of 4"
curl -s "$BASE_URL/availability?restaurantId=R1&sectorId=S1&date=2025-09-08&partySize=4" | python3 -m json.tool | head -20
echo ""
echo ""

# Test 2: Create Reservation (Valid)
echo "✅ Test 2: Create Reservation (During Lunch Shift 12:00-16:00)"
RESERVATION_ID=$(curl -s -X POST $BASE_URL/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-key-001" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T14:00:00-03:00",
    "customer": {
      "name": "Alice Johnson",
      "phone": "+54 9 11 1111-1111",
      "email": "alice@example.com"
    },
    "notes": "Window seat please"
  }' | python3 -m json.tool | tee /dev/tty | grep -o '"id": "[^"]*"' | cut -d'"' -f4)
echo ""
echo ""

# Test 3: Idempotency
echo "✅ Test 3: Idempotency (Retry with same key)"
curl -s -X POST $BASE_URL/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-key-001" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T14:00:00-03:00",
    "customer": {
      "name": "Alice Johnson",
      "phone": "+54 9 11 1111-1111",
      "email": "alice@example.com"
    }
  }' | python3 -m json.tool | grep -E '(id|status)'
echo ""
echo ""

# Test 4: Outside Service Window
echo "❌ Test 4: Outside Service Window (Should fail with 422)"
curl -s -X POST $BASE_URL/reservations \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-key-002" \
  -d '{
    "restaurantId": "R1",
    "sectorId": "S1",
    "partySize": 4,
    "startDateTimeISO": "2025-09-08T18:00:00-03:00",
    "customer": {"name": "Bob", "phone": "123", "email": "bob@test.com"}
  }' | python3 -m json.tool
echo ""
echo ""

# Test 5: List Reservations
echo "✅ Test 5: List Reservations for the Day"
curl -s "$BASE_URL/reservations/day?restaurantId=R1&date=2025-09-08" | python3 -m json.tool
echo ""
echo ""

# Test 6: List Reservations (Filtered by Sector)
echo "✅ Test 6: List Reservations (Filtered by Sector S1)"
curl -s "$BASE_URL/reservations/day?restaurantId=R1&date=2025-09-08&sectorId=S1" | python3 -m json.tool | head -15
echo ""
echo ""

# Test 7: Cancel Reservation
echo "✅ Test 7: Cancel Reservation"
if [ -n "$RESERVATION_ID" ]; then
  HTTP_STATUS=$(curl -s -X DELETE "$BASE_URL/reservations/$RESERVATION_ID" -w "%{http_code}")
  echo "HTTP Status: $HTTP_STATUS (204 expected)"
else
  echo "No reservation ID found to cancel"
fi
echo ""
echo ""

# Test 8: Verify Cancellation
echo "✅ Test 8: Verify Reservation was Cancelled"
curl -s "$BASE_URL/reservations/day?restaurantId=R1&date=2025-09-08" | python3 -m json.tool
echo ""
echo ""

# Test 9: No Capacity (Book all tables)
echo "✅ Test 9: No Capacity (Book all 3 tables for party of 4)"
for i in {1..4}; do
  echo "  Booking table $i..."
  RESULT=$(curl -s -X POST $BASE_URL/reservations \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: capacity-test-$i" \
    -d "{
      \"restaurantId\": \"R1\",
      \"sectorId\": \"S1\",
      \"partySize\": 4,
      \"startDateTimeISO\": \"2025-09-08T21:00:00-03:00\",
      \"customer\": {\"name\": \"Guest $i\", \"phone\": \"123\", \"email\": \"guest$i@test.com\"}
    }" | python3 -m json.tool)
  
  if echo "$RESULT" | grep -q '"error"'; then
    echo "  ❌ Booking $i: No capacity (expected after 3rd booking)"
    echo "$RESULT" | python3 -m json.tool
  else
    TABLE=$(echo "$RESULT" | grep -o '"tableIds": \[[^]]*\]' | head -1)
    echo "  ✅ Booking $i: Success - $TABLE"
  fi
done

echo ""
echo "=================================="
echo "✅ All tests completed!"
echo "=================================="
