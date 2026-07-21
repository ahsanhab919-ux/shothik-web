import asyncio
import re
from playwright import async_api
from playwright.async_api import expect

async def run_test():
    pw = None
    browser = None
    context = None

    try:
        # Start a Playwright session in asynchronous mode
        pw = await async_api.async_playwright().start()

        # Launch a Chromium browser in headless mode with custom arguments
        browser = await pw.chromium.launch(
            headless=True,
            args=[
                "--window-size=1280,720",
                "--disable-dev-shm-usage",
                "--ipc=host",
                "--single-process"
            ],
        )

        # Create a new browser context (like an incognito window)
        context = await browser.new_context()
        # Wider default timeout to match the agent's DOM-stability budget;
        # auto-waiting Playwright APIs (expect, locator.wait_for) inherit this.
        context.set_default_timeout(15000)

        # Open a new page in the browser context
        page = await context.new_page()

        # Interact with the page elements to simulate user flow
        # -> navigate
        await page.goto("http://localhost:3000")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # -> Navigate to the Paraphrase tool page (http://localhost:3000/paraphrase) and verify the page title or header indicates a Paraphrase tool and that an editor or input surface (textarea/input) is visible.
        await page.goto("http://localhost:3000/paraphrase")
        try:
            await page.wait_for_load_state("domcontentloaded", timeout=5000)
        except Exception:
            pass
        
        # --> Assertions to verify final state
        
        # --> Verify the paraphrase tool page is displayed
        # Assert: The browser URL contains '/paraphrase', confirming the Paraphrase tool page is open.
        await expect(page).to_have_url(re.compile("/paraphrase"), timeout=15000), "The browser URL contains '/paraphrase', confirming the Paraphrase tool page is open."
        await page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[1]/div/div/div").nth(0).scroll_into_view_if_needed()
        # Assert: The paraphrase editor textbox is visible on the page.
        await expect(page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[1]/div/div/div").nth(0)).to_be_visible(timeout=15000), "The paraphrase editor textbox is visible on the page."
        
        # --> Verify the tool editor or input surface is visible
        await page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[1]/div/div/div").nth(0).scroll_into_view_if_needed()
        # Assert: The editor input area (contenteditable textbox) is visible.
        await expect(page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[1]/div/div/div").nth(0)).to_be_visible(timeout=15000), "The editor input area (contenteditable textbox) is visible."
        await page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[2]/div/div/div[1]/button[2]").nth(0).scroll_into_view_if_needed()
        # Assert: The Paste Text button is visible, indicating an input surface is available.
        await expect(page.locator("xpath=/html/body/div[2]/div/div/div/div/div[2]/div/div/div[2]/div[2]/div/div[5]/div[1]/div[2]/div/div/div[1]/button[2]").nth(0)).to_be_visible(timeout=15000), "The Paste Text button is visible, indicating an input surface is available."
        await asyncio.sleep(5)

    finally:
        if context:
            await context.close()
        if browser:
            await browser.close()
        if pw:
            await pw.stop()

asyncio.run(run_test())
    