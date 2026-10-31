"use strict";

const P = require(require("path").join(__dirname, "..", ".bt", "node_modules", "puppeteer-core"));

(async () => {
  const browser = await P.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required"],
  });
  const page = await browser.newPage();

  // No Audio override: observe the page exactly as shipped.
  await page.goto("http://127.0.0.1:8137/index.html", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 500));

  const before = await page.evaluate(() => ({
    audioExists: !!window.__rfAudio,
    trace: window.__rfTrace || [],
  }));
  console.log("BEFORE CLICK:", JSON.stringify(before));

  await page.click(".music__toggle");

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 200));
    const s = await page.evaluate((ms) => {
      const a = window.__rfAudio;
      return {
        ms: ms,
        has: !!a,
        vol: a ? Number(a.volume.toFixed(3)) : null,
        paused: a ? a.paused : null,
        time: a ? Number(a.currentTime.toFixed(2)) : null,
        isPlaying: document.querySelector(".music").classList.contains("is-playing"),
      };
    }, (i + 1) * 200);
    console.log("  ", JSON.stringify(s));
  }

  const trace = await page.evaluate(() => window.__dbg || window.__rfTrace || []);
  console.log("\nTRACE:", JSON.stringify(trace));
  await browser.close();
})();
