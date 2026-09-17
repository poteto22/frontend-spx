const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PUBLIC_DIR = __dirname;
const DATA_FILE = path.join(__dirname, 'data', 'rundown.json');
const CONFIG_FILE = path.join(__dirname, 'data', 'config.json');

// Memory store for items
let itemsStore = [
  {
    itemID: 'mainbar',
    head: 'หัวเรื่อง',
    topic: 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ',
    mainbar: './assets/bar/MAIN BAR.png',
    headbar: './assets/head/top-bar-1.png'
  },
  {
    itemID: 'bar2line',
    head: '',
    topic: 'รายงานสดสถานการณ์น้ำท่วมและมาตรการช่วยเหลือประชาชน',
    mainbar: './assets/bar/MAIN BAR.png',
    headbar: ''
  }
];

// Active items map for each itemID (spx template ID)
let activeItemsMap = {};

// Helper to scan asset folder for image files
function scanAssetFolder(folderSubpath) {
  const dirPath = path.join(__dirname, folderSubpath);
  if (!fs.existsSync(dirPath)) return [];
  try {
    const files = fs.readdirSync(dirPath);
    const scanned = files
      .filter(f => !f.startsWith('.') && /\.(png|jpg|jpeg|svg|webp)$/i.test(f))
      .map(f => ({
        label: f,
        value: `${folderSubpath.replace(/\/+$/, '')}/${f}`
      }));
    
    // Add empty option for headbar
    if (folderSubpath.includes('head')) {
      return [{ label: 'none (ไม่เลือก / เว้นว่าง)', value: '' }, ...scanned];
    }
    return scanned;
  } catch (e) {
    console.error(`Error scanning ${folderSubpath}:`, e.message);
    return [];
  }
}

// Function to load config merged with asset directory scanning
function getConfig() {
  let defaultConfig = {
    itemTypes: [
      { label: "Logo บาร์ (logo)", value: "logo" },
      { label: "บาร์ประเด็น (mainbar)", value: "mainbar" },
      { label: "บาร์ 2 บรรทัด (bar2line)", value: "bar2line" },
      { label: "บาร์พิธีกร 2 คน (bar2name)", value: "bar2name" }
    ],
    presetHeads: ["ประเด็นร้อน", "สถานการณ์เด่น", "สัมภาษณ์ทางโทรศัพท์"],
    mainbarOptions: [],
    headbarOptions: [],
    logoOptions: [],
    spxApiUrl: "http://localhost:5656/api/v1",
    endpointUrl: "http://localhost:8080/mainbar"
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
      if (raw.trim()) {
        const parsed = JSON.parse(raw);
        if (parsed.itemTypes && Array.isArray(parsed.itemTypes)) defaultConfig.itemTypes = parsed.itemTypes;
        if (parsed.presetHeads && Array.isArray(parsed.presetHeads)) defaultConfig.presetHeads = parsed.presetHeads;
        if (parsed.spxApiUrl) defaultConfig.spxApiUrl = parsed.spxApiUrl;
        if (parsed.endpointUrl) defaultConfig.endpointUrl = parsed.endpointUrl;
      }
    } catch (e) {
      console.error('Error reading config file:', e.message);
    }
  }

  // ALWAYS scan fresh assets from disk to detect new, renamed, or removed files
  defaultConfig.mainbarOptions = scanAssetFolder('./assets/bar');
  defaultConfig.headbarOptions = scanAssetFolder('./assets/head');
  defaultConfig.logoOptions = scanAssetFolder('./assets/logo');

  return defaultConfig;
}

// Load persisted items if data/rundown.json exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) itemsStore = parsed;
    else if (parsed.templates) itemsStore = parsed.templates;
    else if (parsed.items) itemsStore = parsed.items;
  } catch (e) {
    console.error('Error reading data file:', e.message);
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = reqUrl.pathname;

  // GET /api/config
  if (req.method === 'GET' && pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(getConfig(), null, 2));
    return;
  }

  // Reverse Proxy /spx-api/* to SPX Server (default http://localhost:5656/api/v1)
  if (pathname.startsWith('/spx-api')) {
    const config = getConfig();
    const spxBase = (config && config.spxApiUrl) ? config.spxApiUrl : 'http://localhost:5656/api/v1';
    const subPath = pathname.replace(/^\/spx-api(\/v1)?/, '');
    const targetUrlString = `${spxBase.replace(/\/+$/, '')}${subPath.startsWith('/') ? subPath : '/' + subPath}${reqUrl.search}`;
    
    try {
      const targetUrl = new URL(targetUrlString);
      const clientReq = http.request(targetUrl, {
        method: req.method,
        headers: {
          'accept': 'application/json',
          'content-type': req.headers['content-type'] || 'application/json'
        }
      }, (spxRes) => {
        res.writeHead(spxRes.statusCode, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': spxRes.headers['content-type'] || 'application/json; charset=utf-8'
        });
        spxRes.pipe(res);
      });

      clientReq.on('error', (proxyErr) => {
        console.error(`SPX Proxy error for ${targetUrlString}:`, proxyErr.message);
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: `ไม่สามารถเชื่อมต่อกับ SPX Server ที่ ${targetUrl.origin}: ${proxyErr.message}` }));
      });

      req.pipe(clientReq);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: `URL SPX ไม่ถูกต้อง: ${err.message}` }));
    }
    return;
  }

  // POST /api/rescan-assets - Explicit asset folder rescan
  if (req.method === 'POST' && pathname === '/api/rescan-assets') {
    const config = getConfig();
    try {
      fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    } catch (e) {
      console.error('Error writing config file on rescan:', e.message);
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', config }));
    return;
  }

  // POST /api/config
  if (req.method === 'POST' && pathname === '/api/config') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        payload.mainbarOptions = scanAssetFolder('./assets/bar');
        payload.headbarOptions = scanAssetFolder('./assets/head');
        payload.logoOptions = scanAssetFolder('./assets/logo');

        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', config: getConfig() }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // POST /api/active-item - Sets which specific item data is currently active on-air for a given itemID
  if (req.method === 'POST' && pathname === '/api/active-item') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const itemID = payload.itemID || 'mainbar';
        activeItemsMap[itemID] = {
          head: payload.head !== undefined ? payload.head : (payload.data ? payload.data.head : ''),
          topic: payload.topic !== undefined ? payload.topic : (payload.data ? payload.data.topic : ''),
          line1: payload.line1 !== undefined ? payload.line1 : (payload.data ? payload.data.line1 : ''),
          line2: payload.line2 !== undefined ? payload.line2 : (payload.data ? payload.data.line2 : ''),
          name1: payload.name1 !== undefined ? payload.name1 : (payload.data ? payload.data.name1 : ''),
          name2: payload.name2 !== undefined ? payload.name2 : (payload.data ? payload.data.name2 : ''),
          logo: payload.logo !== undefined ? payload.logo : (payload.data ? payload.data.logo : ''),
          mainbar: payload.mainbar !== undefined ? payload.mainbar : './assets/bar/MAIN BAR.png',
          headbar: payload.headbar !== undefined ? payload.headbar : '',
          ...(payload.data || {}),
          ...payload
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', itemID, activeData: activeItemsMap[itemID] }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API Endpoint to sync items from Frontend
  if (req.method === 'POST' && pathname === '/api/items') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        if (Array.isArray(payload)) itemsStore = payload;
        else if (payload.items) itemsStore = payload.items;
        else if (payload.templates) itemsStore = payload.templates;

        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
        fs.writeFileSync(DATA_FILE, JSON.stringify(itemsStore, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', count: itemsStore.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API Endpoint to fetch all items as JSON array
  if (req.method === 'GET' && pathname === '/api/items') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(itemsStore, null, 2));
    return;
  }

  // List of static paths/extensions to exclude from item ID matching
  const isStaticFile = pathname.startsWith('/css/') ||
                       pathname.startsWith('/js/') ||
                       pathname.startsWith('/assets/') ||
                       pathname.endsWith('.html') ||
                       pathname.endsWith('.css') ||
                       pathname.endsWith('.js') ||
                       pathname.endsWith('.png') ||
                       pathname.endsWith('.jpg') ||
                       pathname.endsWith('.ico');

  if (!isStaticFile && pathname !== '/') {
    const cleanId = pathname.replace(/^\/+/, '').replace(/\.json$/i, '');
    if (cleanId) {
      // 1. Check if an item with this itemID was specifically played/triggered
      if (activeItemsMap[cleanId]) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(activeItemsMap[cleanId], null, 2));
        return;
      }

      // 2. Otherwise check itemsStore for matched item
      const matchedItem = itemsStore.find(i => i.itemID === cleanId || i.id === cleanId);
      if (matchedItem) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          head: matchedItem.head !== undefined ? matchedItem.head : '',
          topic: matchedItem.topic !== undefined ? matchedItem.topic : '',
          mainbar: matchedItem.mainbar !== undefined ? matchedItem.mainbar : './assets/bar/MAIN BAR.png',
          headbar: matchedItem.headbar !== undefined ? matchedItem.headbar : ''
        }, null, 2));
        return;
      } else {
        // Fallback JSON payload
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          head: '',
          topic: 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ',
          mainbar: './assets/bar/MAIN BAR.png',
          headbar: ''
        }, null, 2));
        return;
      }
    }
  }

  // Serve static files
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`SPX-CG Server running at http://localhost:${PORT}/`);
  console.log(`JSON Endpoint available at http://localhost:${PORT}/mainbar`);
});
