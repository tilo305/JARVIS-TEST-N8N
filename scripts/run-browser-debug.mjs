import { chromium } from "playwright";

const url = process.env.BROWSER_DEBUG_URL ?? "http://127.0.0.1:8080/";
const headless = process.env.BROWSER_DEBUG_HEADLESS !== "false";
const timeoutMs = Number(process.env.BROWSER_DEBUG_TIMEOUT_MS ?? "20000");

const ensureOk = (value, message) => {
  if (!value) {
    throw new Error(message);
  }
};

const run = async () => {
  console.log(`🔌 Connecting to ${url}`);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (message) => {
    const type = message.type().toUpperCase();
    const text = message.text();
    if (type === "ERROR" || type === "WARNING") {
      console.log(`[browser:${type}] ${text}`);
    }
  });

  page.on("pageerror", (error) => {
    console.log(`[browser:PAGEERROR] ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    const failure = request.failure();
    console.log(
      `[browser:REQUESTFAILED] ${failure?.errorText ?? "Unknown error"} ${request.url()}`
    );
  });

  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      console.log(`[browser:HTTP${status}] ${response.url()}`);
    }
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

  await page.waitForFunction(
    () => typeof window !== "undefined" && !!window.jarvisDebug,
    { timeout: timeoutMs }
  );

  await page.waitForFunction(
    () => window.jarvisDebug && typeof window.jarvisDebug.browser === "function",
    { timeout: timeoutMs }
  );

  console.log("🧪 Running window.jarvisDebug.browser()...");
  const browserResult = await page.evaluate(async () => {
    return window.jarvisDebug?.browser?.();
  });

  console.log("🧪 Fetching window.jarvisDebug.errors()...");
  const errors = await page.evaluate(async () => {
    return window.jarvisDebug?.errors?.();
  });

  ensureOk(errors !== null, "Browser debug tools did not return errors array.");

  console.log("✅ Browser debug completed.");
  if (Array.isArray(errors) && errors.length > 0) {
    console.log(`❌ Browser reported ${errors.length} error(s):`);
    for (const error of errors) {
      console.log(`- ${error?.message ?? "Unknown error"}`);
    }
  } else {
    console.log("✅ No browser errors reported.");
  }

  if (browserResult) {
    console.log("📦 Browser debug result:");
    console.log(JSON.stringify(browserResult, null, 2));
  }

  await browser.close();
};

run().catch((error) => {
  console.error("❌ Browser debug run failed:", error);
  process.exit(1);
});
