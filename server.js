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
    head: 'รายงานสด',
    line1: 'สถานการณ์น้ำท่วม',
    line2: 'และมาตรการช่วยเหลือประชาชน',
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

let blocksStore = [];

// Load persisted items & blocks if data/rundown.json exists
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      itemsStore = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      itemsStore = parsed.items;
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        blocksStore = parsed.blocks;
      }
    } else if (parsed.templates && Array.isArray(parsed.templates)) {
      itemsStore = parsed.templates;
      if (parsed.blocks && Array.isArray(parsed.blocks)) {
        blocksStore = parsed.blocks;
      }
    }
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
        let logoVal = payload.logo !== undefined ? payload.logo : (payload.data ? payload.data.logo : '');

        if (!logoVal && itemID === 'logo') {
          const topicVal = payload.topic || (payload.data ? payload.data.topic : '');
          if (topicVal && topicVal.includes('Logo: ')) {
            const fileName = topicVal.split('Logo: ').pop().trim();
            logoVal = `./assets/logo/${fileName}`;
          } else {
            const config = getConfig();
            if (config.logoOptions && config.logoOptions.length > 0) {
              logoVal = config.logoOptions[0].value;
            }
          }
        }

        activeItemsMap[itemID] = {
          head: payload.head !== undefined ? payload.head : (payload.data ? payload.data.head : ''),
          topic: payload.topic !== undefined ? payload.topic : (payload.data ? payload.data.topic : ''),
          line1: payload.line1 !== undefined ? payload.line1 : (payload.data ? payload.data.line1 : ''),
          line2: payload.line2 !== undefined ? payload.line2 : (payload.data ? payload.data.line2 : ''),
          name1: payload.name1 !== undefined ? payload.name1 : (payload.data ? payload.data.name1 : ''),
          name2: payload.name2 !== undefined ? payload.name2 : (payload.data ? payload.data.name2 : ''),
          logo: logoVal,
          mainbar: payload.mainbar !== undefined ? payload.mainbar : './assets/bar/MAIN BAR.png',
          headbar: payload.headbar !== undefined ? payload.headbar : '',
          ...(payload.data || {}),
          ...payload
        };

        // Also ensure activeItemsMap[itemID].logo is set
        activeItemsMap[itemID].logo = logoVal;

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
        if (Array.isArray(payload)) {
          itemsStore = payload;
        } else if (payload.items) {
          itemsStore = payload.items;
          if (Array.isArray(payload.blocks)) blocksStore = payload.blocks;
        } else if (payload.templates) {
          itemsStore = payload.templates;
          if (Array.isArray(payload.blocks)) blocksStore = payload.blocks;
        }

        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
        const dataToSave = (blocksStore && blocksStore.length > 0)
          ? { blocks: blocksStore, items: itemsStore }
          : itemsStore;
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2), 'utf8');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', count: itemsStore.length, blocksCount: blocksStore.length }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API Endpoint to fetch all items as JSON array or object
  if (req.method === 'GET' && pathname === '/api/items') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (blocksStore && blocksStore.length > 0) {
      res.end(JSON.stringify({ blocks: blocksStore, items: itemsStore }, null, 2));
    } else {
      res.end(JSON.stringify(itemsStore, null, 2));
    }
    return;
  }

  // API Endpoint for blocks
  if (req.method === 'GET' && pathname === '/api/blocks') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(blocksStore, null, 2));
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

// Helper to convert relative asset path to full HTTP URL
function toFullUrl(pathStr, req) {
  if (!pathStr || typeof pathStr !== 'string') return pathStr || '';
  if (pathStr.startsWith('http://') || pathStr.startsWith('https://') || pathStr.startsWith('data:')) {
    return pathStr;
  }
  const host = (req && req.headers && req.headers.host) ? req.headers.host : 'localhost:8080';
  const cleanPath = pathStr.replace(/^\.?\//, '');
  const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `http://${host}/${encodedPath}`;
}

// Helper to format JSON response per item type
function formatItemResponse(item, cleanId, req) {
  const itemID = item.itemID || cleanId;

  if (itemID === 'mainbar' || cleanId === 'mainbar') {
    return {
      head: item.head !== undefined ? item.head : '',
      topic: item.topic !== undefined ? item.topic : 'มอบทุนศึกษา-อุปกรณ์กีฬา รร.ผลิตนักตบทีมชาติ',
      mainbar: toFullUrl(item.mainbar !== undefined ? item.mainbar : './assets/bar/MAIN BAR.png', req),
      headbar: toFullUrl(item.headbar !== undefined ? item.headbar : '', req)
    };
  }

  if (itemID === 'logo' || cleanId === 'logo') {
    let logoVal = item.logo !== undefined ? item.logo : '';
    if (!logoVal) {
      if (item.topic && item.topic.includes('Logo: ')) {
        const fileName = item.topic.split('Logo: ').pop().trim();
        logoVal = `./assets/logo/${fileName}`;
      } else {
        const config = getConfig();
        if (config.logoOptions && config.logoOptions.length > 0) {
          logoVal = config.logoOptions[0].value;
        }
      }
    }
    return {
      logo: toFullUrl(logoVal, req),
      itemID: 'logo'
    };
  }

  if (itemID === 'bar2line' || cleanId === 'bar2line') {
    return {
      head: item.head !== undefined ? item.head : '',
      line1: item.line1 !== undefined ? item.line1 : '',
      line2: item.line2 !== undefined ? item.line2 : '',
      mainbar: toFullUrl(item.mainbar !== undefined ? item.mainbar : './assets/bar/MAIN BAR.png', req),
      headbar: toFullUrl(item.headbar !== undefined ? item.headbar : '', req),
      itemID: 'bar2line'
    };
  }

  if (itemID === 'bar2name' || cleanId === 'bar2name') {
    return {
      head: item.head !== undefined ? item.head : '',
      name1: item.name1 !== undefined ? item.name1 : '',
      name2: item.name2 !== undefined ? item.name2 : '',
      line2: item.line2 !== undefined ? item.line2 : '',
      mainbar: toFullUrl(item.mainbar !== undefined ? item.mainbar : './assets/bar/MAIN BAR.png', req),
      headbar: toFullUrl(item.headbar !== undefined ? item.headbar : '', req),
      itemID: 'bar2name'
    };
  }

  // Fallback for any other custom item types
  let resObj = {
    head: item.head !== undefined ? item.head : '',
    topic: item.topic !== undefined ? item.topic : '',
    mainbar: toFullUrl(item.mainbar !== undefined ? item.mainbar : './assets/bar/MAIN BAR.png', req),
    headbar: toFullUrl(item.headbar !== undefined ? item.headbar : '', req)
  };
  if (item.line1) resObj.line1 = item.line1;
  if (item.line2) resObj.line2 = item.line2;
  if (item.name1) resObj.name1 = item.name1;
  if (item.name2) resObj.name2 = item.name2;
  if (item.logo) resObj.logo = toFullUrl(item.logo, req);
  return resObj;
}

  if (!isStaticFile && pathname !== '/') {
    const cleanId = pathname.replace(/^\/+/, '').replace(/\.json$/i, '');
    if (cleanId) {
      // 1. Check if an item with this itemID was specifically played/triggered
      if (activeItemsMap[cleanId]) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(formatItemResponse(activeItemsMap[cleanId], cleanId, req), null, 2));
        return;
      }

      // 2. Otherwise check itemsStore for matched item
      const matchedItem = itemsStore.find(i => i.itemID === cleanId || i.id === cleanId);
      if (matchedItem) {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(formatItemResponse(matchedItem, cleanId, req), null, 2));
        return;
      } else {
        // Fallback JSON payload
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(formatItemResponse({}, cleanId, req), null, 2));
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
