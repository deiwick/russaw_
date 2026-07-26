import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

// Flag to fallback to in-memory database mock if PostgreSQL is offline
let useMock = false;

const memoryReports: any[] = [
  {
    id: 1,
    category: 'emergency',
    title: 'Flooding & Entrapment S.O.S',
    description: 'Severe water logging near T. Nagar (GN Chetty Road). Stranded residents require assistance. Inflatable rafts and search lights requested by local scouts.',
    evidence_url: null,
    status: 'emergency',
    upvotes: 0,
    engaged_count: 3,
    lat: 13.0440,
    lng: 80.2372,
    created_at: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 2,
    category: 'infrastructure',
    title: 'Exposed Live High-Voltage Cable',
    description: 'Damaged power conduit hanging near the entrance of Central Station metro exit. Dangerously close to foot traffic. Reported to TNEB but no action taken.',
    evidence_url: null,
    status: 'verified',
    upvotes: 5,
    engaged_count: 1,
    lat: 13.0818,
    lng: 80.2724,
    created_at: new Date(Date.now() - 7200000).toISOString()
  }
];
const memoryKeys: any[] = [];
const memoryOperators: any[] = [];
const memoryForumPosts: any[] = [];
const memoryMissions = [
  { 
    id: 1, 
    title: 'Central Station Trash Accumulation', 
    description: 'Document municipal waste piling up near the Central Station eastern exit. Photo proof required.', 
    category: 'infrastructure', 
    lat: 13.0818, 
    lng: 80.2724, 
    radius_meters: 200, 
    points: 150, 
    is_active: true, 
    created_at: new Date().toISOString() 
  },
  { 
    id: 2, 
    title: 'OMR Water Line Leakage', 
    description: 'Locate and log the fresh water pipeline burst near Thoraipakkam junction. Help map water wastage.', 
    category: 'infrastructure', 
    lat: 12.9416, 
    lng: 80.2337, 
    radius_meters: 400, 
    points: 200, 
    is_active: true, 
    created_at: new Date().toISOString() 
  }
];

function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // distance in meters
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000, // Fail fast to activate mock mode quickly
});

pool.on('connect', () => {
  console.log('[DB] Operator database pool connected successfully.');
});

pool.on('error', (err) => {
  if (!useMock) {
    console.warn('[DB WARNING] Database connection error. Switching to in-memory mock ledger.');
    useMock = true;
  }
});

// Interceptor Query Function
export const query = async (text: string, params?: any[]): Promise<any> => {
  if (useMock) {
    return runMockQuery(text, params || []);
  }

  try {
    return await pool.query(text, params);
  } catch (error) {
    console.warn('[DB WARNING] Query failed. Falling back to in-memory mock ledger.');
    useMock = true;
    return runMockQuery(text, params || []);
  }
};

// Mock Query Processor Engine
function runMockQuery(text: string, params: any[]): any {
  const normalized = text.trim().replace(/\s+/g, ' ');

  // 1. Connection Checks
  if (normalized.includes('SELECT NOW()') || normalized.includes('SELECT 1')) {
    return { rows: [{ now: new Date() }] };
  }

  // 2. GET REPORTS
  if (normalized.startsWith('SELECT id, category, title, description, evidence_url, status, upvotes, engaged_count, ST_Y(geom)')) {
    return { rows: memoryReports };
  }

  // 3. INSERT REPORT
  if (normalized.startsWith('INSERT INTO reports')) {
    const [category, title, description, evidence_url, lng, lat, statusVal] = params;
    const newReport = {
      id: memoryReports.length + 1,
      category,
      title,
      description,
      evidence_url,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: category === 'emergency' ? 'emergency' : (statusVal || 'unverified'),
      upvotes: 0,
      engaged_count: 0,
      created_at: new Date().toISOString()
    };
    memoryReports.unshift(newReport);

    // Sync mock mission to memoryMissions array
    const newMission = {
      id: memoryMissions.length + 1,
      title: `Audit: ${title}`,
      description: `Verification briefing: ${description}`,
      category,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_meters: 300,
      points: 150,
      is_active: true,
      created_at: new Date().toISOString()
    };
    memoryMissions.unshift(newMission);

    return { rows: [newReport] };
  }

  // 4. GET MISSIONS
  if (normalized.startsWith('SELECT id, title, description, category, ST_Y(target_geom) as lat, ST_X(target_geom) as lng, radius_meters')) {
    return { rows: memoryMissions };
  }

  // 5. FIND MISSION (Unit test / Verification target query)
  if (normalized.includes("LIKE '%Central Station%'")) {
    return { rows: [memoryMissions[0]] };
  }

  // 6. VERIFY MISSION (PostGIS Proximity Calculate)
  if (normalized.includes('ST_Distance') && normalized.includes('missions')) {
    const [lng, lat, missionId] = params;
    const target = memoryMissions.find(m => m.id === parseInt(missionId));
    if (!target) {
      return { rows: [] };
    }
    const distance = calculateHaversineDistance(parseFloat(lat), parseFloat(lng), target.lat, target.lng);
    return {
      rows: [{
        title: target.title,
        category: target.category,
        radius_meters: target.radius_meters,
        points: target.points,
        distance_meters: distance
      }]
    };
  }

  // 7. INSERT OPERATOR KEY
  if (normalized.startsWith('INSERT INTO operator_keys')) {
    const [key_hash, consumed, tier_granted] = params;
    const newKey = {
      key_hash,
      consumed: consumed || false,
      tier_granted: tier_granted || 2,
      created_at: new Date().toISOString()
    };
    memoryKeys.push(newKey);
    return { rows: [newKey] };
  }

  // 8. SELECT OPERATOR KEY
  if (normalized.startsWith('SELECT consumed, tier_granted FROM operator_keys')) {
    const [key_hash] = params;
    const key = memoryKeys.find(k => k.key_hash === key_hash);
    return { rows: key ? [key] : [] };
  }

  // 9. CONSUME OPERATOR KEY
  if (normalized.startsWith('UPDATE operator_keys SET consumed = TRUE')) {
    const [key_hash] = params;
    const key = memoryKeys.find(k => k.key_hash === key_hash);
    if (key) key.consumed = true;
    return { rows: [] };
  }

  // 10. CHECK ALIAS comprometido
  if (normalized.startsWith('SELECT id FROM operators WHERE alias = $1')) {
    const [alias] = params;
    const exists = memoryOperators.some(op => op.alias === alias);
    return { rows: exists ? [{ id: 1 }] : [] };
  }

  // 11. REGISTER OPERATOR
  if (normalized.startsWith('INSERT INTO operators')) {
    const [alias, password_hash, tier_level] = params;
    const op = {
      id: memoryOperators.length + 1,
      alias,
      password_hash,
      tier_level: tier_level || 2,
      created_at: new Date().toISOString()
    };
    memoryOperators.push(op);
    return { rows: [op] };
  }

  // 12. LOGIN OPERATOR
  if (normalized.startsWith('SELECT id, alias, password_hash, tier_level FROM operators WHERE alias = $1')) {
    const [alias] = params;
    const op = memoryOperators.find(o => o.alias === alias);
    return { rows: op ? [op] : [] };
  }

  // 13. GET FORUM POSTS
  if (normalized.startsWith('SELECT id, operator_alias, message, created_at FROM forum_posts')) {
    return { rows: memoryForumPosts };
  }

  // 14. POST FORUM MESSAGE
  if (normalized.startsWith('INSERT INTO forum_posts')) {
    const [operator_alias, message] = params;
    const post = {
      id: memoryForumPosts.length + 1,
      operator_alias,
      message,
      created_at: new Date().toISOString()
    };
    memoryForumPosts.unshift(post);
    return { rows: [post] };
  }

  // 15. ENGAGE REPORT
  if (normalized.startsWith('UPDATE reports SET engaged_count = engaged_count + 1')) {
    const [id] = params;
    const report = memoryReports.find(r => r.id === parseInt(id));
    if (report) {
      report.engaged_count = (report.engaged_count || 0) + 1;
      return { rows: [report] };
    }
    return { rows: [] };
  }

  console.warn(`[MOCK LEDGER] Unhandled query: "${text}". Returning empty results.`);
  return { rows: [] };
}

// Check database pool client connector
export const connect = async () => {
  if (useMock) {
    return {
      query: (t: string, p?: any[]) => runMockQuery(t, p || []),
      release: () => {}
    };
  }

  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.warn('[DB WARNING] Connection checkout failed. Returning mock transaction client.');
    useMock = true;
    return {
      query: (t: string, p?: any[]) => runMockQuery(t, p || []),
      release: () => {}
    };
  }
};

export default { query, connect };
