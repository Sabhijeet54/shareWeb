import https from 'https';
import zlib from 'zlib';

const url = 'https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz';

function fetchUrl(u) {
  return new Promise((resolve, reject) => {
    https.get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

const buf = await fetchUrl(url);
let jsonStr;
try { jsonStr = zlib.gunzipSync(buf).toString('utf-8'); } catch { jsonStr = buf.toString('utf-8'); }
const data = JSON.parse(jsonStr);

console.log('Total instruments:', data.length);
const eq = data.filter(i => i.instrument_type === 'EQ');
console.log('EQ instruments:', eq.length);

// Check specific stocks
for (const sym of ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'SBIN', 'TMCV', 'ETERNAL']) {
  const found = eq.find(i => i.trading_symbol === sym);
  if (found) {
    console.log(`${sym}: key=${found.instrument_key} isin=${found.isin}`);
  } else {
    console.log(`${sym}: NOT FOUND`);
  }
}

// Show first 3 instruments of each type to understand structure
const types = [...new Set(data.map(i => i.instrument_type))];
console.log('\nInstrument types:', types.join(', '));
