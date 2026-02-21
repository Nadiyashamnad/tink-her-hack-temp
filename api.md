# CycleSense API Documentation

This document provides example `curl` requests for all available API endpoints in the CycleSense backend.

**Base URL:** `http://localhost:5000`

> [!NOTE]
> Authentication has been disabled. `Authorization` headers are no longer required.

---

## Period Tracking APIs

### Add Period Entry
Record a new menstrual cycle entry.

**Endpoint:** `POST /api/period/add`

```bash
curl -X POST http://localhost:5000/api/period/add \
     -H "Content-Type: application/json" \
     -d '{
           "startDate": "2024-02-21",
           "endDate": "2024-02-26",
           "painLevel": 3,
           "fatigueLevel": 2,
           "mood": "Happy",
           "symptoms": ["bloating", "cramps"]
         }'
```

---

### Get Period History
Retrieve all period entries.

**Endpoint:** `GET /api/period`

```bash
curl -X GET http://localhost:5000/api/period
```

---

## Appointment APIs

### Book Appointment
Schedule a new doctor's appointment.

**Endpoint:** `POST /api/appointment/book`

```bash
curl -X POST http://localhost:5000/api/appointment/book \
     -H "Content-Type: application/json" \
     -d '{
           "doctor": "Dr. Smith",
           "date": "2024-03-15T10:00:00Z",
           "reason": "General Checkup"
         }'
```

---

### Get Appointments
Retrieve all appointments.

**Endpoint:** `GET /api/appointment`

```bash
curl -X GET http://localhost:5000/api/appointment
```

---

## Food & Nutrition APIs

### Add Food Entry
Log a food item.

**Endpoint:** `POST /api/food/add`

```bash
curl -X POST http://localhost:5000/api/food/add \
     -H "Content-Type: application/json" \
     -d '{
           "name": "Avocado Toast",
           "category": "Breakfast",
           "date": "2024-02-21T08:30:00Z"
         }'
```

---

### Get Food History
Retrieve all food logs.

**Endpoint:** `GET /api/food`

```bash
curl -X GET http://localhost:5000/api/food
```

---

### Delete Food Entry
Remove a specific food log.

**Endpoint:** `DELETE /api/food/:id`

```bash
curl -X DELETE http://localhost:5000/api/food/REPLACE_WITH_FOOD_ID
```
