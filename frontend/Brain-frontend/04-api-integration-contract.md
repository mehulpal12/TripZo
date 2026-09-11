# 04 — Frontend API Integration Contract

The frontend must inspect the actual backend implementation before finalizing endpoint names and response types.

Known backend capabilities from the project tracker:

## Auth

- register
- login
- refresh
- logout
- protected routes

Frontend responsibilities:
- authenticate
- bootstrap session
- attach access token
- refresh expired access token
- handle refresh failure
- redirect to login
- prevent infinite refresh loops

## Riders / rides

Known backend capabilities:
- fare estimate
- immediate ride creation
- get ride by ID
- ride history
- cancellation
- scheduled ride creation

## Captains

Known backend capabilities:
- online/offline
- captain rides
- accept
- reject
- arrived
- start
- complete

## API client rules

Create one API client.

It must:
- use a single configured base URL
- serialize request data consistently
- normalize backend errors
- attach auth credentials consistently
- support abort/cancellation where useful
- expose typed functions

Example conceptual API modules:

authApi
rideApi
captainApi
scheduledRideApi
userApi

Do not create one-off fetch calls inside pages.

## Error contract

Normalize backend errors into a stable frontend error shape:
- status
- code if available
- message
- fieldErrors if available
- retryable flag

Never show raw stack traces or internal database errors to users.

## Backend contract verification

Before implementation:
1. inspect backend route registration
2. inspect controller/service functions
3. inspect Zod request validation
4. inspect response shapes
5. inspect auth middleware
6. inspect error handler
7. create frontend types from verified contracts
8. document any mismatch
