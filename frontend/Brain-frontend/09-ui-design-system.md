# 09 — UI Design System

TRIPZO should look like a coherent product, not a collection of pages.

## Design principles

- mobile-first
- high contrast
- obvious primary actions
- minimal cognitive load during active rides
- clear ride status
- strong error recovery
- accessible controls
- consistent spacing and typography
- predictable navigation

## Required reusable components

Button
IconButton
Input
Select
DatePicker
TimePicker
Card
Badge
Modal
Drawer
Toast
Alert
Skeleton
Spinner
EmptyState
ErrorState
ConfirmDialog
Avatar
Tabs
BottomNavigation
TopBar
StatusTimeline
RideCard
CaptainCard
LocationField
MapContainer

## Ride-specific UX

The current ride state must be visually dominant.

Examples:
SEARCHING -> searching indicator + cancellation option
ACCEPTED -> captain details + live location
ARRIVED -> captain arrived indicator
IN_PROGRESS -> active trip tracking
COMPLETED -> trip summary

Avoid showing five competing CTAs.

## Accessibility

- keyboard navigation
- visible focus states
- labels for form controls
- semantic buttons
- aria-live for important realtime status changes
- adequate touch targets
- reduced-motion consideration
