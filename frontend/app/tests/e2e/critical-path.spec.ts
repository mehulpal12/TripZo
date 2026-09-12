import { test, expect } from '@playwright/test';

test.describe('Critical Path: Ride Booking Flow', () => {
  test('Rider can book a ride and Captain can accept it', async ({ browser }) => {
    test.setTimeout(120000);
    // We create two separate browser contexts for Rider and Captain
    const riderContext = await browser.newContext();
    const captainContext = await browser.newContext();

    const riderPage = await riderContext.newPage();
    riderPage.on('console', msg => console.log('RIDER CONSOLE:', msg.text()));
    const captainPage = await captainContext.newPage();

    const uniqueSuffix = Date.now();
    const captainEmail = `captain_${uniqueSuffix}@tripzo.com`;
    const riderEmail = `rider_${uniqueSuffix}@tripzo.com`;

    // 1. Captain registers, logs in and goes online
    captainPage.on('console', msg => console.log('CAPTAIN CONSOLE:', msg.text()));
    
    // Register Captain
    await captainPage.goto('http://localhost:3000/register');
    await captainPage.locator('button', { hasText: 'Captain' }).click();
    await captainPage.locator('input#email').fill(captainEmail);
    await captainPage.locator('button', { hasText: 'Register Profile' }).click();
    
    // Login Captain
    await captainPage.waitForURL('**/login');
    await captainPage.locator('button', { hasText: 'Captain' }).click();
    await captainPage.locator('input#email').fill(captainEmail);
    await captainPage.locator('button', { hasText: 'Initiate Sequence' }).click();
    await captainPage.waitForURL('**/captain');
    
    // Check if captain is offline and click toggle
    const toggleButton = captainPage.locator('button', { hasText: 'Driver Cockpit Status' });
    await expect(toggleButton).toBeVisible({ timeout: 10000 });
    await toggleButton.click();
    
    // Verify captain goes online
    await expect(captainPage.locator('text=ONLINE · ACCEPTING RIDES')).toBeVisible({ timeout: 15000 });

    // 2. Rider registers, logs in and requests a ride
    // Register Rider
    await riderPage.goto('http://localhost:3000/register');
    await riderPage.locator('button', { hasText: 'Rider' }).click();
    await riderPage.locator('input#email').fill(riderEmail);
    await riderPage.locator('button', { hasText: 'Register Profile' }).click();
    
    // Login Rider
    await riderPage.waitForURL('**/login');
    await riderPage.locator('button', { hasText: 'Rider' }).click();
    await riderPage.locator('input#email').fill(riderEmail);
    await riderPage.locator('button', { hasText: 'Initiate Sequence' }).click();
    await riderPage.waitForURL('**/rider');
    
    // Select pickup
    await riderPage.locator('input[placeholder="Pickup Location"]').click();
    // Select destination
    await riderPage.locator('input[placeholder="Where to?"]').click();
    
    // Select Bike
    await riderPage.getByRole('button', { name: 'Bike', exact: true }).click();
    
    // Book Ride
    const bookButton = riderPage.locator('button', { hasText: /Book BIKE/i });
    await expect(bookButton).toBeVisible({ timeout: 15000 });
    await bookButton.click();

    // Verify Rider is searching
    await expect(riderPage.locator('text=Searching for Captains')).toBeVisible({ timeout: 15000 });

    // 3. Captain receives request and accepts
    // Wait for the new request overlay on captain side
    await expect(captainPage.locator('text=NEW RIDE REQUEST')).toBeVisible({ timeout: 10000 });
    
    // Captain clicks Accept
    await captainPage.locator('button', { hasText: 'ACCEPT RIDE' }).click();

    // 4. Verify Ride is in progress on both sides
    await expect(captainPage.locator('text=ACTIVE RIDE')).toBeVisible({ timeout: 15000 });
    await expect(riderPage.locator('text=Captain Arriving')).toBeVisible({ timeout: 15000 });

    // 5. Captain Arrives
    await captainPage.locator('button', { hasText: 'Arrived at Pickup' }).click();
    await expect(riderPage.locator('text=Captain Arrived')).toBeVisible({ timeout: 15000 });

    // 6. Captain Starts and Completes Trip
    await captainPage.locator('button', { hasText: 'Start Trip' }).click();
    await expect(riderPage.locator('text=Ride In Progress')).toBeVisible({ timeout: 15000 });
    await captainPage.locator('button', { hasText: 'Complete Trip' }).click();

    // Rider should be back to booking panel
    await expect(riderPage.locator('input[placeholder="Pickup Location"]')).toBeVisible({ timeout: 15000 });

    // Cleanup
    await riderContext.close();
    await captainContext.close();
  });
});
