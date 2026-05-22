import https from "https";

const fs = await import("fs");
const envContent = fs.readFileSync(".env.local", "utf-8");
var tk = envContent.split("\n").find(l => l.startsWith("UPSTOX_ACCESS_TOKEN="))?.replace("UPSTOX_ACCESS_TOKEN=", "").trim();

function apiCall(path) {
  return new Promise((resolve, reject) => {
    const url = `https://api.upstox.com/v2${path}`;
    const req = https.get(url, {
      headers: {
        "Accept": "application/json", 
        "Authorization": `Bearer ${tk}`
      }
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch (e) {
          resolve({ status: res.statusCode, data: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on("error", reject);
  });
}

function apiCall3(path) {
  return new Promise((resolve, reject) => {
    const url = `https://api.upstox.com/v3${path}`;
    const req = https.get(url, {
      headers: {
        "Accept": "application/json", 
        "Authorization": `Bearer ${tk}`
      }
    }, (res) => {
      const chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(Buffer.concat(chunks).toString()) });
        } catch (e) {
          resolve({ status: res.statusCode, data: Buffer.concat(chunks).toString() });
        }
      });
    });
    req.on("error", reject);
  });
}

console.log("=== 1. REST Quote API ===");
const q = await apiCall("/market-quote/quotes?instrument_key=NSE_EQ%7CINE002A01018,NSE_EQ%7CINE467B01029,NSE_INDEX%7CNifty%2050");
console.log("HTTP Status:", q.status);
if (q.data?.data) {
  for (const [k, v] of Object.entries(q.data.data)) {
    console.log(`  ${k}: LTP=${v.last_price}, Vol=${v.volume}`);
  }
} else {
  console.log("  Error:", JSON.stringify(q.data));
}

console.log("\n=== 2. WebSocket Auth (v2 - deprecated) ===");
const ws = await apiCall("/feed/market-data-feed/authorize");
console.log("HTTP Status:", ws.status);
console.log("  Response:", JSON.stringify(ws.data?.errors?.[0]?.message || ws.data?.data));

console.log("\n=== 3. WebSocket Auth (v3 - new) ===");
const ws3 = await apiCall3("/feed/market-data-feed");
console.log("HTTP Status:", ws3.status);
if (ws3.data?.data?.authorizedRedirectUri) {
  console.log("  WS URL: YES -", ws3.data.data.authorizedRedirectUri.substring(0, 80) + "...");
} else {
  console.log("  Response:", JSON.stringify(ws3.data));
}

console.log("\n=== 3. Token validity check ===");
console.log("Token starts with:", tk?.substring(0, 20) + "...");
console.log("Token length:", tk?.length);
