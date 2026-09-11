# 03 — Screen and Route Map

## Public

- /login
- /register
- /unauthorized
- /404

## Rider

- /rider
- /rider/book
- /rider/ride/:rideId
- /rider/rides
- /rider/rides/:rideId
- /rider/scheduled
- /rider/scheduled/new
- /rider/profile

## Captain

- /captain
- /captain/availability
- /captain/ride/:rideId
- /captain/rides
- /captain/rides/:rideId
- /captain/profile

## Rider home

Must support:
- pickup location
- destination
- fare estimate
- immediate vs scheduled booking
- nearby/active ride status
- clear primary CTA

## Booking flow

1. Enter pickup
2. Enter destination
3. Show estimate
4. Confirm ride
5. Show SEARCHING
6. Receive captain assignment through realtime event
7. Show captain/latest-location information
8. Track state transitions
9. Complete/cancel
10. Show final ride summary

## Scheduled ride flow

1. Select pickup
2. Select destination
3. Select future date/time
4. Validate scheduling constraints
5. Confirm
6. Show scheduled status
7. Show details
8. Reflect SEARCHING/assignment when backend starts matching

## Captain home

Must support:
- online/offline toggle
- current status
- incoming ride request
- accept/reject
- active ride
- location updates
- completed ride history

## Captain active ride

Display state-specific actions:
- ACCEPTED -> route toward rider / wait
- ARRIVED -> start ride
- IN_PROGRESS -> complete ride
- COMPLETED -> summary

Do not display actions that are invalid for the current backend ride state.

## Every screen needs

- loading state
- empty state where applicable
- API error state
- authorization failure state
- network/offline state
- retry behavior
- mobile layout
