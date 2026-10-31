"use strict";
const P = require(require("path").join(__dirname, "..", ".bt", "node_modules", "puppeteer-core"));
(async () => {
  const browser = await P.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:8137/rules.html", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.getElementById("rule-12").scrollIntoView());
  await new Promise((r) => setTimeout(r, 1200));
  const info = await page.evaluate(() => {
    const band = [window.innerHeight * 0.25, window.innerHeight * 0.4];
    const rows = [];
    for (let n = 9; n <= 14; n++) {
      const el = document.getElementById("rule-" + n);
      const r = el.getBoundingClientRect();
      rows.push({ id: "rule-" + n, top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) });
    }
    const cur = document.querySelector(".rules-toc__link.is-current");
    return { scrollY: Math.round(window.scrollY), band: band.map(Math.round), rows, current: cur ? cur.getAttribute("href") : null };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
