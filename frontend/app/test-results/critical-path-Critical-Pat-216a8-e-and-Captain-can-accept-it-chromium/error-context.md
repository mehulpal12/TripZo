# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-path.spec.ts >> Critical Path: Ride Booking Flow >> Rider can book a ride and Captain can accept it
- Location: tests\e2e\critical-path.spec.ts:4:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=ACTIVE RIDE')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('text=ACTIVE RIDE') with timeout 5000ms
  - waiting for locator('text=ACTIVE RIDE')

```

```yaml
- alert
- banner:
  - text: TRIPZO NEW DELHI · LIVE NETWORK
  - navigation:
    - link "Book Ride":
      - /url: /rider
    - link "Live Tracking":
      - /url: /rider
    - link "Captain Console":
      - /url: /captain
    - button "Ride History"
    - button "Scheduled Trips"
  - button "search Search coordinate... ⌘K"
  - text: SOCKET 99.98%
  - button "Notifications": notifications
  - img "Captain Vikram"
  - text: Capt. Vikram Tier-1 Elite Moto
- main:
  - button "Driver Cockpit Status ONLINE · ACCEPTING RIDES power_settings_new"
  - text: Shift Revenue Phase 8 ₹1,420 +14% vs avg Completed Trips 9 / 12 Target Acceptance Metric 98.2% verified Captain Score 4.95 star (1.2k) check_circle Priority Dispatch Alert
  - heading "ACCEPTED" [level=2]
  - text: two_wheeler TRIPZO Moto Fleet Sector · Rapid Express ₹406 bolt Instant Settlement PICKUP · 1.2 km away 3 MINS ETA
  - paragraph: Connaught Place
  - text: DESTINATION
  - paragraph: Cyber City
  - text: sync LOCKING ROUTE... event_upcoming Scheduled Queue 1 UPCOMING alarm Today, 2:30 PM (Reservation) ₹490
  - paragraph: Connaught Place Metro ➔ T3 IGI Airport Departure
  - text: "Confirmed with Flight AI Sync #AI-902 Details chevron_right battery_charging_full Battery Range 84% · 118 km network_check Mesh Latency 18 ms · Strong"
  - img
  - text: "navigation YOU (Capt. Vikram) PICKUP: CP Gate 4 DROP: Cyber City B10 HIGH SURGE DEMAND (+1.3x) · DLF & Outer Ring"
  - 'button "local_fire_department Surge Heatmap: ON"'
  - button "Layers": layers
  - button "Traffic": traffic
  - button "directions Google Maps Turn-by-Turn"
  - button "call Rider Contact"
  - button "shield"
  - button "pause_circle Go Offline"
  - text: speed Speed Telemetry 42 km/h Within City Limits payments Weekly Payout Status ₹11,480 Auto-transfer on Monday verified_user Safety Shield ACTIVE Delhi Police Telematics Sync
- contentinfo:
  - text: TRIPZO Autonomous Urban Mobility Operations Cockpit © 2025
  - button "Telematics Protocol"
  - button "Fleet Operations"
  - button "Safety Dispatch"
  - button "System Status"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Critical Path: Ride Booking Flow', () => {
  4  |   test('Rider can book a ride and Captain can accept it', async ({ browser }) => {
  5  |     test.setTimeout(120000);
  6  |     // We create two separate browser contexts for Rider and Captain
  7  |     const riderContext = await browser.newContext();
  8  |     const captainContext = await browser.newContext();
  9  | 
  10 |     const riderPage = await riderContext.newPage();
  11 |     riderPage.on('console', msg => console.log('RIDER CONSOLE:', msg.text()));
  12 |     const captainPage = await captainContext.newPage();
  13 | 
  14 |     const uniqueSuffix = Date.now();
  15 |     const captainEmail = `captain_${uniqueSuffix}@tripzo.com`;
  16 |     const riderEmail = `rider_${uniqueSuffix}@tripzo.com`;
  17 | 
  18 |     // 1. Captain registers, logs in and goes online
  19 |     captainPage.on('console', msg => console.log('CAPTAIN CONSOLE:', msg.text()));
  20 |     
  21 |     // Register Captain
  22 |     await captainPage.goto('http://localhost:3000/register');
  23 |     await captainPage.locator('button', { hasText: 'Captain' }).click();
  24 |     await captainPage.locator('input#email').fill(captainEmail);
  25 |     await captainPage.locator('button', { hasText: 'Register Profile' }).click();
  26 |     
  27 |     // Login Captain
  28 |     await captainPage.waitForURL('**/login');
  29 |     await captainPage.locator('button', { hasText: 'Captain' }).click();
  30 |     await captainPage.locator('input#email').fill(captainEmail);
  31 |     await captainPage.locator('button', { hasText: 'Initiate Sequence' }).click();
  32 |     await captainPage.waitForURL('**/captain');
  33 |     
  34 |     // Check if captain is offline and click toggle
  35 |     const toggleButton = captainPage.locator('button', { hasText: 'Driver Cockpit Status' });
  36 |     await expect(toggleButton).toBeVisible({ timeout: 10000 });
  37 |     await toggleButton.click();
  38 |     
  39 |     // Verify captain goes online
  40 |     await expect(captainPage.locator('text=ONLINE · ACCEPTING RIDES')).toBeVisible();
  41 | 
  42 |     // 2. Rider registers, logs in and requests a ride
  43 |     // Register Rider
  44 |     await riderPage.goto('http://localhost:3000/register');
  45 |     await riderPage.locator('button', { hasText: 'Rider' }).click();
  46 |     await riderPage.locator('input#email').fill(riderEmail);
  47 |     await riderPage.locator('button', { hasText: 'Register Profile' }).click();
  48 |     
  49 |     // Login Rider
  50 |     await riderPage.waitForURL('**/login');
  51 |     await riderPage.locator('button', { hasText: 'Rider' }).click();
  52 |     await riderPage.locator('input#email').fill(riderEmail);
  53 |     await riderPage.locator('button', { hasText: 'Initiate Sequence' }).click();
  54 |     await riderPage.waitForURL('**/rider');
  55 |     
  56 |     // Select pickup
  57 |     await riderPage.locator('input[placeholder="Pickup Location"]').click();
  58 |     // Select destination
  59 |     await riderPage.locator('input[placeholder="Where to?"]').click();
  60 |     
  61 |     // Select Bike
  62 |     await riderPage.getByRole('button', { name: 'Bike', exact: true }).click();
  63 |     
  64 |     // Book Ride
  65 |     const bookButton = riderPage.locator('button', { hasText: /Book BIKE/i });
  66 |     await expect(bookButton).toBeEnabled();
  67 |     await bookButton.click();
  68 |     
  69 |     // Rider should see "Searching for Captains"
  70 |     await expect(riderPage.locator('text=Searching for Captains')).toBeVisible();
  71 | 
  72 |     // 3. Captain receives request and accepts
  73 |     // Wait for the new request overlay on captain side
  74 |     await expect(captainPage.locator('text=NEW RIDE REQUEST')).toBeVisible({ timeout: 10000 });
  75 |     
  76 |     // Captain clicks Accept
  77 |     await captainPage.locator('button', { hasText: 'ACCEPT RIDE' }).click();
  78 | 
  79 |     // 4. Verify Ride is in progress on both sides
> 80 |     await expect(captainPage.locator('text=ACTIVE RIDE')).toBeVisible();
     |                                                           ^ Error: expect(locator).toBeVisible() failed
  81 |     await expect(riderPage.locator('text=Captain Arriving')).toBeVisible();
  82 | 
  83 |     // 5. Captain Arrives
  84 |     await captainPage.locator('button', { hasText: 'Arrived at Pickup' }).click();
  85 |     await expect(riderPage.locator('text=Ride In Progress')).toBeVisible();
  86 | 
  87 |     // 6. Captain Starts and Completes Trip
  88 |     await captainPage.locator('button', { hasText: 'Start Trip' }).click();
  89 |     await captainPage.locator('button', { hasText: 'Complete Trip' }).click();
  90 | 
  91 |     // Rider should be back to booking panel
  92 |     await expect(riderPage.locator('input[placeholder="Pickup Location"]')).toBeVisible();
  93 | 
  94 |     // Cleanup
  95 |     await riderContext.close();
  96 |     await captainContext.close();
  97 |   });
  98 | });
  99 | 
```