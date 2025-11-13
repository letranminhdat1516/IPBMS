import { $Enums, Prisma, PrismaClient } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
const prisma = new PrismaClient();

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function runWithReconnect<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: any) {
      const msg = String(err?.message || err || '');
      if (msg.includes('prepared statement') || err?.code === '26000') {
        attempt++;
        const backoff = 100 * attempt; // ms
        try {
          await prisma.$disconnect();
        } catch {}
        // short backoff before reconnecting
        await sleep(backoff);
        try {
          await prisma.$connect();
        } catch {}
        if (attempt >= maxAttempts) throw err;
        // small delay before retrying the operation
        await sleep(50);
        continue;
      }
      throw err;
    }
  }
}

// Silent variant of runWithReconnect which suppresses intermediate logs for noisy batched
// operations where transient reconnects are expected and the extra log lines are not helpful.
async function runWithReconnectSilent<T>(fn: () => Promise<T>, maxAttempts = 5): Promise<T> {
  const origLog = (console as any).log;
  try {
    (console as any).log = () => {};
    return await runWithReconnect(fn, maxAttempts);
  } finally {
    (console as any).log = origLog;
  }
}

/** Convert various timestamp strings (e.g., "2025-09-12 17:33:41.344+07") to Date */
function normalizeDateTime(v: any): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return v;
  if (typeof v !== 'string') return v;
  let s = v.trim();
  // Replace space with 'T' for ISO-ish format
  s = s.replace(' ', 'T');
  // Ensure timezone has colon, e.g. +07 -> +07:00 or +0700 -> +07:00
  s = s.replace(/([+-]\d{2})(\d{2})?$/, (_, h, m) => `${h}:${m || '00'}`);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
/** Try to parse JSON-ish strings into objects; otherwise return the original string */
function normalizeJson(v: any): any {
  if (v == null) return null;
  if (typeof v === 'object') return v;
  if (typeof v === 'string') {
    const s = v.trim();
    // Try parsing directly
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') {
        const inner = parsed.trim();
        if (
          (inner.startsWith('{') && inner.endsWith('}')) ||
          (inner.startsWith('[') && inner.endsWith(']'))
        ) {
          return JSON.parse(inner);
        }
      }
      return parsed;
    } catch {
      // If it looks like JSON but failed due to escaping, keep the raw string
      return s;
    }
  }
  return v;
}

/**
 * Normalize days_of_week input into array of short day names ['mon','tue',...]
 * Accepts: null, JSON string like '[1,2,3]', array of numbers, array of names, or name string
 */
function mapDaysOfWeek(v: any): string[] | null {
  if (v == null) return null;
  let parsed = v;
  if (typeof v === 'string') {
    const s = v.trim();
    // try parse JSON array
    try {
      parsed = JSON.parse(s);
    } catch {
      // maybe comma separated names
      if (s.includes(',')) parsed = s.split(',').map((x) => x.trim());
      else parsed = [s];
    }
  }
  if (!Array.isArray(parsed)) return null;
  const mapNumToDay = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const out: string[] = [];
  for (const it of parsed) {
    if (typeof it === 'number') {
      const d = mapNumToDay[it % 7];
      out.push(d);
    } else if (typeof it === 'string') {
      const low = it.toLowerCase();
      // accept names like 'mon', 'monday', or numbers in string
      if (/^\d+$/.test(low)) {
        const n = Number(low);
        out.push(mapNumToDay[n % 7]);
      } else if (low.startsWith('mon')) out.push('mon');
      else if (low.startsWith('tue')) out.push('tue');
      else if (low.startsWith('wed')) out.push('wed');
      else if (low.startsWith('thu')) out.push('thu');
      else if (low.startsWith('fri')) out.push('fri');
      else if (low.startsWith('sat')) out.push('sat');
      else if (low.startsWith('sun')) out.push('sun');
    }
  }
  return out.length ? out : null;
}

/** Quote a value for inclusion in a raw SQL VALUES list. Uses simple escaping suited for controlled seed data. */
function sqlQuote(v: any): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  // For numbers, return as-is
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  // Otherwise treat as string and escape single quotes
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function parseConfidenceScore(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseFloat(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function determineEventStatus(
  raw: any,
  normalizedType: string | $Enums.event_type_enum,
  confidence: number | null,
): $Enums.event_status_enum | null {
  const rawStatus = raw.status == null ? '' : String(raw.status).toLowerCase();

  if (String(normalizedType) === 'normal_activity') {
    if (rawStatus === 'danger' || rawStatus === 'warning') return rawStatus as any;
    return 'normal';
  }

  if (String(normalizedType) === 'sleep') {
    if (confidence != null) return 'normal';
    if (!rawStatus) return 'normal';
    if (rawStatus === 'new' || rawStatus === 'verified') return 'normal';
    return ['danger', 'warning', 'normal'].includes(rawStatus) ? (rawStatus as any) : 'normal';
  }

  if (confidence != null) {
    if (confidence >= 0.9 && (normalizedType === 'fall' || normalizedType === 'emergency'))
      return 'danger';
    if (confidence >= 0.75) return 'warning';
    return 'normal';
  }

  if (!rawStatus) return null;
  if (rawStatus === 'new' || rawStatus === 'verified') return 'normal';
  return ['danger', 'warning', 'normal'].includes(rawStatus) ? (rawStatus as any) : null;
}

function formatDetectedAtForDescription(date: Date | null): string | null {
  if (!date) return null;
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return null;
  }
}

function buildEventDescription(
  raw: any,
  normalizedType: string | $Enums.event_type_enum,
  status: string | null,
  confidence: number | null,
  detectedAt: Date | null,
): string {
  const typeLabelMap: Record<string, string> = {
    fall: 'Phát hiện ngã',
    abnormal_behavior: 'Phát hiện hành vi bất thường',
    emergency: 'Phát hiện tình huống khẩn cấp',
    normal_activity: 'Hoạt động bình thường được ghi nhận',
    sleep: 'Ghi nhận giấc ngủ',
  };

  const statusLabelMap: Record<string, string> = {
    danger: 'Cảnh báo nghiêm trọng',
    warning: 'Cảnh báo',
    normal: 'Bình thường',
  };

  const parts: string[] = [];
  if (status && status !== 'normal' && statusLabelMap[status]) {
    parts.push(statusLabelMap[status]);
  }

  const baseLabel = typeLabelMap[String(normalizedType)] || 'Sự kiện được ghi nhận';
  const corePieces = [baseLabel];
  if (confidence != null && Number.isFinite(confidence)) {
    const pct = Math.round(confidence * 100);
    corePieces.push(`Độ tin cậy ${pct}%`);
  }
  parts.push(corePieces.join(' – '));

  const formattedTime = formatDetectedAtForDescription(detectedAt);
  if (formattedTime) parts.push(`Thời gian ${formattedTime}`);

  const notes = typeof raw?.notes === 'string' ? raw.notes.trim() : '';
  if (notes) parts.push(`Ghi chú: ${notes}`);

  return parts.join(' | ');
}

// Utility: ensure a string is a valid UUID, otherwise generate one and optionally track replacements
function isValidUuid(s: any): boolean {
  if (typeof s !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

const _generatedIdMap: Map<string, string> = new Map();
function ensureUuidMaybe(original?: string): string | null {
  if (!original) return null;
  if (isValidUuid(original)) return original;
  if (_generatedIdMap.has(original)) return _generatedIdMap.get(original)!;
  const g = randomUUID();
  _generatedIdMap.set(original, g);
  return g;
}

// Deterministic UUID v5-like from a string (sha1 based). Useful to produce stable UUIDs
function deterministicUuid(input: string): string {
  const hash = createHash('sha1').update(input).digest('hex');
  // format into UUID segments: 8-4-4-4-12
  const a = hash.substring(0, 8);
  const b = hash.substring(8, 12);
  let c = hash.substring(12, 16);
  let d = hash.substring(16, 20);
  const e = hash.substring(20, 32);
  // set version to 5 (0101)
  c = ((parseInt(c, 16) & 0x0fff) | 0x5000).toString(16).padStart(4, '0');
  // set variant to 10xx
  d = ((parseInt(d, 16) & 0x3fff) | 0x8000).toString(16).padStart(4, '0');
  return `${a}-${b}-${c}-${d}-${e}`;
}

function normalizeSupplementId(rawId?: string | null, customerId?: string | null): string {
  const ensured = ensureUuidMaybe(rawId ?? undefined);
  if (ensured) return ensured;
  const seed = rawId || customerId || 'supplement:generic';
  return deterministicUuid(`supplement:${seed}`);
}

// ...existing code...

const TARGET_CUSTOMER_IDS = new Set<string>([
  '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
  '9943b3a7-ec53-4508-a9c2-39bda13ed6bc',
]);

const TARGET_SUPPLEMENT_IDS: Set<string> = new Set();
const supplementIdByUser: Map<string, string> = new Map();

// --------------------- RAW INPUT DATA ---------------------
const rawUsers = [
  {
    idx: 0,
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c1',
    username: 'caregiver01111',
    email: 'caregiver02119@email.com',
    password_hash: '$2b$10$4EHVFEi2mxt7kXeHExQW9e744.iD.IRtZsqy7XllB8gFKOnZMyyCK',
    full_name: 'Nguyen Van B1',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84865081222',
    is_active: true,
    created_at: '2025-09-12 17:33:41.344+07',
    updated_at: '2025-09-12 17:33:41.344+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 1,
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
    username: 'admin1',
    email: 'admin1@healthcare.com',
    password_hash: '$2b$10$UD2E8vQ2gUKG4ej65gDoAOS03vRNkGqMDJtnfMjKrcxwKVrAflmNO',
    full_name: 'ADMIN12',
    role: 'admin',
    date_of_birth: null,
    phone_number: '84865081126',
    is_active: true,
    created_at: '2025-08-27 22:42:18.888753+07',
    updated_at: '2025-08-27 22:42:18.888753+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 2,
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c3',
    username: 'admin_demo',
    email: 'admin@example.com',
    password_hash: '$2b$10$rD4YfZP6CGDmvx0gF1Bp1eY7kO/bGHdV4Yg5Krqk1/jMVUL0okViW',
    full_name: 'Admin Demo',
    role: 'admin',
    date_of_birth: null,
    phone_number: null,
    is_active: true,
    created_at: '2025-08-19 04:08:52.730275+07',
    updated_at: '2025-08-19 04:08:52.730275+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 4,
    user_id: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f',
    username: 'caregiver01',
    email: 'caregiver01@email.com',
    password_hash: '$2b$10$Y6g1eQcMERlhVptH7U6cE.GEDhmnT7iSnZmAi9bzHADeH1OdWmnj.',
    full_name: 'Nguyen Van B',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84865081429',
    is_active: true,
    created_at: '2025-08-23 21:04:47.695758+07',
    updated_at: '2025-08-23 21:04:47.695758+07',
    otp_code: '961824',
    otp_expires_at: '2025-08-31 07:00:00+07',
  },
  {
    idx: 6,
    user_id: '2d764db1-3400-4871-94c3-eef22bb0934d',
    username: 'caregiver10',
    email: 'caregiver10@email.com',
    password_hash: '$2b$10$qJ489tFOcRalGpuxPOL9ie/jfRudFY42zQdc8taeiEjCMtqvvbb9q',
    full_name: 'Nguyen Van B',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84342551806',
    is_active: true,
    created_at: '2025-08-25 23:29:10.613094+07',
    updated_at: '2025-08-25 23:29:10.613094+07',
    otp_code: '417020',
    otp_expires_at: '2025-09-03 07:00:00+07',
  },
  {
    idx: 7,
    user_id: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
    username: 'kwwoitd',
    email: 'khoitdse170302@fpt.edu.vn',
    password_hash: '$2b$10$79VBQCmfY1134/rQ.5DUt.La27lgO1QC7DMrSZBnOFuMij0fO/Ibe',
    full_name: 'Nguyễn Văn A',
    role: 'customer',
    date_of_birth: '1990-01-01',
    phone_number: '84865081427',
    is_active: true,
    created_at: '2025-08-19 03:28:54.074213+07',
    updated_at: '2025-08-19 03:28:54.074213+07',
    otp_code: '825894',
    otp_expires_at: '2025-09-15 00:26:24.607+07',
  },
  {
    idx: 8,
    user_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e',
    username: 'user444',
    email: 'user2423@email.com',
    password_hash: '$2b$10$UJcHRQedfEGf22TZrXo4De8OAj4g26QudIactEYoJc/K.svKvrIhW',
    full_name: 'Nguyen Van A',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84823944945',
    is_active: true,
    created_at: '2025-08-27 23:11:03.13377+07',
    updated_at: '2025-08-27 23:11:03.13377+07',
    otp_code: '487647',
    otp_expires_at: '2025-09-16 22:37:30.72+07',
  },
  {
    idx: 9,
    user_id: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
    username: 'admin',
    email: 'admin@healthcare.com',
    password_hash: '$2b$10$IABF0zbDgsFfJ.jIlCluI.XVbH7Zqc09gGXlZx3SPzdAPoWEXLceu',
    full_name: 'ADMIN',
    role: 'admin',
    date_of_birth: null,
    phone_number: '84865081426',
    is_active: true,
    created_at: '2025-08-19 04:45:21.126366+07',
    updated_at: '2025-08-19 04:45:21.126366+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 11,
    user_id: '5385c3cf-882e-4248-ae2d-704688fc1f85',
    username: 'nguyenvanbo',
    email: 'nguyenvanbo@gmail.com',
    password_hash: '$2b$10$lwOz7gk.Ep4PKIUxwybv1eEtGpWEeBTOLYfruRkldaY79OpcrhGae',
    full_name: 'Nguyễn  Văn Bờ',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84823944955',
    is_active: true,
    created_at: '2025-09-07 21:43:43.195004+07',
    updated_at: '2025-09-07 21:43:43.195004+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 12,
    user_id: '60779c5c-28f5-4848-a043-c6c9746d3504',
    username: 'caregiver02',
    email: 'caregiver02@email.com',
    password_hash: '$2b$10$5.wMxBjBLTCc6Is/BYtLLO0qm8FHkyUAzg79YmfZQqKDYpZVsAGsO',
    full_name: 'Nguyen Van B',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '848650814271',
    is_active: true,
    created_at: '2025-08-25 21:18:17.870247+07',
    updated_at: '2025-08-25 21:18:17.870247+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 13,
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
    username: 'customer1',
    email: 'customer1@example.com',
    password_hash: '$2b$12$customerplaceholderhash',
    full_name: 'John Patient',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84865081249',
    is_active: true,
    created_at: '2025-08-23 03:33:18.653+07',
    updated_at: '2025-08-23 03:33:18.653+07',
    otp_code: '997449',
    otp_expires_at: '2025-09-04 07:00:00+07',
  },
  {
    idx: 14,
    user_id: '8e13d8ac-0260-4fbb-b270-71f0733b64f1',
    username: 'DEMO19',
    email: 'demo19@gmail.com',
    password_hash: '$2b$10$7kmgEE9Oofeg8yUN96h/i..zERrZCk6bvewvhfLj01v1VyNhWWoqq',
    full_name: 'DMEODEMO',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84823844845',
    is_active: true,
    created_at: '2025-08-19 04:57:58.871791+07',
    updated_at: '2025-08-19 04:57:58.871791+07',
    otp_code: '180880',
    otp_expires_at: '2025-08-19 07:00:00+07',
  },
  {
    idx: 15,
    user_id: '92d69662-1d5f-46b1-8dca-ec16fcce5a26',
    username: 'caregiver0111',
    email: 'caregiver0111@gmail.com',
    password_hash: '$2b$10$dnTD8NThaWmZLLLtCEZ/1es01y2dMuPMpbUP4ZRbzeJAk5J.gr92S',
    full_name: 'Nguyen Van B',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84865081221',
    is_active: true,
    created_at: '2025-08-27 22:24:36.173647+07',
    updated_at: '2025-08-27 22:24:36.173647+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 16,
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc',
    username: 'user111',
    email: 'user1@email.com',
    password_hash: '$2b$10$6c.g3N2.oODvH5LlqcOoiuRosKNjHyXWy04SXRXF0enhBvug6z0eG',
    full_name: 'Nguyen Van A',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84865081427',
    is_active: false,
    created_at: '2025-09-12 17:37:59.636+07',
    updated_at: '2025-09-12 17:37:59.636+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 17,
    user_id: 'a584cf26-4883-4d26-b0b8-703c5ba61b96',
    username: 'nguyenvanc',
    email: 'nguyenvanc@gmail.com',
    password_hash: '$2b$10$L8j3jC7oSy5AFF/X0FFNLe3LUAfNK/T2vNJkpLfvXomRrfpR8RsDK',
    full_name: 'Nguyễn Văn C',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84762944955',
    is_active: true,
    created_at: '2025-09-07 21:46:56.733079+07',
    updated_at: '2025-09-07 21:46:56.733079+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 18,
    user_id: 'c177821c-eaa6-4e75-bcf1-e1cff9597850',
    username: 'user1',
    email: 'user242@email.com',
    password_hash: '$2b$10$VizHN6mZtjJts/mWCZZcSOtek.pWF8qRvJpRIANiHZlmm11GLSV2W',
    full_name: 'Nguyen Van A',
    role: 'customer',
    date_of_birth: null,
    phone_number: '84123476789',
    is_active: true,
    created_at: '2025-08-27 22:54:40.868904+07',
    updated_at: '2025-08-27 22:54:40.868904+07',
    otp_code: null,
    otp_expires_at: null,
  },
  {
    idx: 19,
    user_id: 'e26b41e7-30b4-4b69-99d8-5312188c1ebc',
    username: 'caregiver011',
    email: 'caregiver011@email.com',
    password_hash: '$2b$10$6Z1BZYCDB6q5RsSuF5FNYO7BjOnovJp.LSczUWMrK/WNIfKfv64yC',
    full_name: 'Nguyen Van B',
    role: 'caregiver',
    date_of_birth: null,
    phone_number: '84865081227',
    is_active: true,
    created_at: '2025-08-27 22:23:26.505167+07',
    updated_at: '2025-08-27 22:23:26.505167+07',
    otp_code: null,
    otp_expires_at: null,
  },
];

const rawCameras = [
  {
    idx: 0,
    camera_id: '46260c49-9c11-4def-905f-cb5bddde1cc1',
    user_id: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
    camera_name: 'phòng khách (RTSP 59)',
    camera_type: 'ip',
    ip_address: '192.168.8.59',
    port: 554,
    rtsp_url: 'rtsp://admin:L2C37340@192.168.8.59:554/cam/realmonitor?channel=1&subtype=1',
    username: 'admin',
    password: 'L2C37340',
    location_in_room: 'Phòng khách',
    resolution: '1920x1080',
    fps: 25,
    status: 'active',
    last_ping: '2025-11-05 09:00:00+07',
    is_online: true,
    last_heartbeat_at: '2025-11-05 09:00:00+07',
    created_at: '2025-11-05 09:00:00+07',
    updated_at: '2025-11-05 09:00:00+07',
  },
  {
    idx: 1,
    camera_id: 'f1e47fb9-f8a7-4882-a2c4-aefd06a99690',
    user_id: '37cbad15-483d-42ff-b07d-fbf3cd1cc863',
    camera_name: 'Camera phòng khách (RTSP 60)',
    camera_type: 'ip',
    ip_address: '192.168.8.60',
    port: 554,
    rtsp_url: 'rtsp://admin:L24009D7@192.168.8.60:554/cam/realmonitor?channel=1&subtype=1',
    username: 'admin',
    password: 'L24009D7',
    location_in_room: 'Phòng khách',
    resolution: '1920x1080',
    fps: 25,
    status: 'active',
    last_ping: '2025-11-05 09:05:00+07',
    is_online: true,
    last_heartbeat_at: '2025-11-05 09:05:00+07',
    created_at: '2025-11-05 09:05:00+07',
    updated_at: '2025-11-05 09:05:00+07',
  },
];

// Alerts were merged into notifications in the schema; raw legacy alert fixtures removed.

const rawNotifications = [
  {
    idx: 0,
    notification_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    event_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc', // user111
    business_type: 'event_alert',
    notification_type: 'push',
    message: 'Phát hiện ngã tại phòng khách lúc 14:30',
    delivery_data:
      '{"fcm_token": "fGHI1234567890abcdefghijklmnopqrstuvwxyzABCDEF-smartphone", "priority": "high"}',
    status: 'pending',
    sent_at: null,
    delivered_at: null,
    retry_count: 0,
    error_message: null,
  },
  {
    idx: 1,
    notification_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    event_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f', // caregiver01
    business_type: 'system_update',
    notification_type: 'push',
    message: 'Camera "Nhà bếp" đã mất kết nối từ 18:30 hôm qua',
    delivery_data:
      '{"fcm_token": "dEFG5678901234hijklmnopqrstuvwxyzABCDEF567890-android", "priority": "normal"}',
    status: 'delivered',
    sent_at: '2025-09-16 18:35:00+07',
    delivered_at: '2025-09-16 18:35:05+07',
    retry_count: 0,
    error_message: null,
  },
];

const rawSnapshots = [
  {
    idx: 0,
    snapshot_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c3', // admin_demo
    file_path: '/snapshots/2025/09/17/living-room-14-30-15.jpg',
    file_size: 2048576, // 2MB
    capture_type: 'alert_triggered',
    timestamp: '2025-09-17 14:30:15+07',
    metadata: '{"trigger": "fall_detection", "confidence": 0.95, "region": "center"}',
    created_at: '2025-09-17 14:30:15+07',
  },
  {
    idx: 1,
    snapshot_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc', // user111
    file_path: '/snapshots/2025/09/17/bedroom-10-00-00.jpg',
    file_size: 1536000, // 1.5MB
    capture_type: 'scheduled',
    timestamp: '2025-09-17 10:00:00+07',
    metadata: '{"schedule": "hourly", "quality": "high"}',
    created_at: '2025-09-17 10:00:00+07',
  },
  {
    idx: 2,
    snapshot_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    camera_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c5', // caregiver_demo
    file_path: '/snapshots/2025/09/17/hallway-manual-capture.jpg',
    file_size: 1792000, // 1.75MB
    capture_type: 'manual',
    timestamp: '2025-09-17 09:45:30+07',
    metadata: '{"manual_trigger": "caregiver_request", "notes": "Kiểm tra vệ sinh hành lang"}',
    created_at: '2025-09-17 09:45:30+07',
  },
  // Add snapshots referenced by event detections (used by seed)
  {
    idx: 3,
    snapshot_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698',
    file_path: '/snapshots/2025/09/18/extra-1.jpg',
    file_size: 1024000,
    capture_type: 'scheduled',
    timestamp: '2025-09-18 12:00:00+07',
    metadata: '{}',
    created_at: '2025-09-18 12:00:00+07',
  },
  {
    idx: 4,
    snapshot_id: 'e2f80d4c-ad16-4c56-9e7f-5b6c7d8e9f0a',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c3',
    file_path: '/snapshots/2025/09/20/extra-2.jpg',
    file_size: 2048000,
    capture_type: 'alert_triggered',
    timestamp: '2025-09-20 07:45:00+07',
    metadata: '{}',
    created_at: '2025-09-20 07:45:00+07',
  },
];

const rawEventDetections = [
  {
    idx: 0,
    event_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    snapshot_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c3', // admin_demo
    event_type: 'fall',
    confidence_score: 0.95,
    detection_data:
      '{"coordinates": {"x": 320, "y": 240, "width": 80, "height": 120}, "severity": "high", "duration": 3.5}',
    detected_at: '2025-09-17 14:30:00+07',
    verified_by: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f', // caregiver01
    verified_at: '2025-09-17 14:35:00+07',
    notes: 'Xác nhận sự cố ngã. Đã liên hệ gia đình và cấp cứu.',
  },
  {
    idx: 1,
    event_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    snapshot_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc', // user111
    event_type: 'normal_activity',
    confidence_score: 0.87,
    detection_data:
      '{"coordinates": {"x": 150, "y": 180, "width": 60, "height": 90}, "duration": 12.3}',
    detected_at: '2025-09-17 08:15:00+07',
    verified_by: null,
    verified_at: null,
    notes: null,
  },
  {
    idx: 2,
    event_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    snapshot_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49', // customer1
    event_type: 'intrusion',
    confidence_score: 0.78,
    detection_data: '{"coords": {"x": 400, "y": 200, "w": 120, "h": 220}}',
    detected_at: '2025-09-18 02:20:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Hệ thống phát hiện có người lạ',
    bounding_boxes: '[{"x":400,"y":200,"w":120,"h":220}]',
    ai_analysis_result: '{"label":"person","behavior":"loitering"}',
    acknowledged_by: '0a69c351-f39c-4b1f-90bb-76e7952400c1',
    acknowledged_at: '2025-09-18 02:22:00+07',
    status: 'normal',
    confirm_status: true,
  },
  {
    idx: 3,
    event_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    snapshot_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698', // customer2
    event_type: 'normal_activity',
    confidence_score: 0.6,
    detection_data: '{"coords": {"x": 120, "y": 220, "w": 60, "h": 90}}',
    detected_at: '2025-09-19 11:00:00+07',
    verified_by: null,
    verified_at: null,
    notes: null,
    bounding_boxes: null,
    ai_analysis_result: null,
    acknowledged_by: null,
    acknowledged_at: null,
    status: 'normal',
    confirm_status: null,
  },
  {
    idx: 4,
    event_id: 'e2f80d4c-ad16-4c56-9e7f-5b6c7d8e9f0a',
    snapshot_id: 'e2f80d4c-ad16-4c56-9e7f-5b6c7d8e9f0a',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c5', // caregiver_demo
    event_type: 'fall',
    confidence_score: 0.99,
    detection_data: '{"coords": {"x": 210, "y": 310, "w": 90, "h": 140}}',
    detected_at: '2025-09-20 07:45:00+07',
    verified_by: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f',
    verified_at: '2025-09-20 07:47:00+07',
    notes: 'Phát hiện ngã khẩn cấp và đã được người chăm sóc xác nhận',
    bounding_boxes: '[{"x":210,"y":310,"w":90,"h":140}]',
    ai_analysis_result: '{"label":"fall","severity":"critical"}',
    acknowledged_by: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
    acknowledged_at: '2025-09-20 07:48:00+07',
    dismissed_at: null,
    status: 'normal',
    confirm_status: true,
  },
  {
    idx: 5,
    event_id: 'f3091e5d-be27-4d67-8f80-6c7d8e9f0a1b',
    snapshot_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    camera_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    user_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e', // user444 (customer)
    event_type: 'abnormal_behavior',
    confidence_score: 0.82,
    detection_data: '{"coords": {"x": 300, "y": 210, "w": 80, "h": 160}, "anomaly": "loitering"}',
    detected_at: '2025-09-21 13:22:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Hành vi bất thường gần cửa chính, cần xem lại camera.',
    bounding_boxes: '[{"x":300,"y":210,"w":80,"h":160}]',
    ai_analysis_result: '{"label":"abnormal_behavior","pattern":"loitering"}',
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'warning',
    confirm_status: false,
  },
  {
    idx: 6,
    event_id: '07a41f6e-cf38-4e78-9a91-7d8e9f0a1b2c',
    snapshot_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '60779c5c-28f5-4848-a043-c6c9746d3504', // caregiver02
    event_type: 'normal_activity',
    confidence_score: 0.65,
    detection_data: '{"coords": {"x": 80, "y": 120, "w": 50, "h": 80}}',
    detected_at: '2025-09-22 09:10:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Hoạt động bình thường, theo dõi tiếp',
    bounding_boxes: null,
    ai_analysis_result: null,
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'normal',
    confirm_status: null,
  },
  // Thêm các event mẫu bằng tiếng Việt để kiểm tra hiển thị nội dung và trạng thái
  {
    idx: 7,
    event_id: '18b52f7f-d049-4f89-8ab2-8e9f0a1b2c3d',
    snapshot_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
    event_type: 'fall',
    confidence_score: 0.93,
    detection_data: JSON.stringify({ coords: { x: 210, y: 310, w: 90, h: 140 }, severity: 'high' }),
    detected_at: '2025-09-23 07:15:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Phát hiện ngã: cần kiểm tra ngay. Người chăm sóc đã nhận thông báo.',
    bounding_boxes: '[{"x":210,"y":310,"w":90,"h":140}]',
    ai_analysis_result: '{"label":"fall","severity":"critical"}',
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'new',
    confirm_status: null,
  },
  {
    idx: 8,
    event_id: '29c63fa0-e15a-4a9a-9bc3-9f0a1b2c3d4e',
    snapshot_id: 'e2f80d4c-ad16-4c56-9e7f-5b6c7d8e9f0a',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e',
    event_type: 'abnormal_behavior',
    confidence_score: 0.81,
    detection_data: JSON.stringify({
      coords: { x: 300, y: 200, w: 80, h: 160 },
      anomaly: 'loitering',
    }),
    detected_at: '2025-09-24 13:05:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Hoạt động lạ gần cửa chính, đã gửi cảnh báo tới chủ nhà.',
    bounding_boxes: '[{"x":300,"y":200,"w":80,"h":160}]',
    ai_analysis_result: '{"label":"abnormal_behavior","pattern":"loitering"}',
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'warning',
    confirm_status: false,
  },
  {
    idx: 9,
    event_id: '3ad74fb1-f26b-4bab-abd4-0a1b2c3d4e5f',
    snapshot_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    camera_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698',
    event_type: 'normal_activity',
    confidence_score: 0.68,
    detection_data: JSON.stringify({ coords: { x: 120, y: 220, w: 60, h: 90 } }),
    detected_at: '2025-09-25 09:20:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Hoạt động bình thường: đi lại trong phòng. Không cần can thiệp.',
    bounding_boxes: null,
    ai_analysis_result: null,
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'normal',
    confirm_status: null,
  },
  {
    idx: 10,
    event_id: '4be85fc2-037c-4cbc-bce5-1b2c3d4e5f6a',
    snapshot_id: 'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
    camera_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
    event_type: 'sleep',
    confidence_score: 0.92,
    detection_data: JSON.stringify({
      stage: 'deep_sleep',
      duration_minutes: 45,
      movement_index: 0.08,
    }),
    detected_at: '2025-09-25 22:45:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'AI ghi nhận bệnh nhân bước vào giấc ngủ sâu.',
    bounding_boxes: null,
    ai_analysis_result: JSON.stringify({ sleep_quality: 'good', hr_variability: 0.12 }),
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'normal',
    confirm_status: null,
  },
  {
    idx: 11,
    event_id: '5cf96fd3-148d-4cdc-cdf6-2c3d4e5f6a7b',
    snapshot_id: 'e2f80d4c-ad16-4c56-9e7f-5b6c7d8e9f0a',
    camera_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c5',
    event_type: 'sleep',
    confidence_score: 0.76,
    detection_data: JSON.stringify({
      stage: 'light_sleep',
      duration_minutes: 20,
      movement_index: 0.22,
    }),
    detected_at: '2025-09-26 13:10:00+07',
    verified_by: null,
    verified_at: null,
    notes: 'Giấc ngủ ngắn sau vật lý trị liệu.',
    bounding_boxes: null,
    ai_analysis_result: JSON.stringify({ nap_detected: true }),
    acknowledged_by: null,
    acknowledged_at: null,
    dismissed_at: null,
    status: 'normal',
    confirm_status: null,
  },
];

// If we need more sample events for testing, synthesize them programmatically
(() => {
  const target = 100; // increase to >50 as requested (approx ~100 events)
  const existing = rawEventDetections.length;
  const cameraPool = [
    'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    'd1e7fc3b-9ca5-4b45-8d6e-4a5b6c7d8e9f',
  ];
  const userPool = Array.from(TARGET_CUSTOMER_IDS);
  const types = ['normal_activity', 'fall', 'sleep', 'abnormal_behavior', 'emergency'];
  for (let i = existing; i < target; i++) {
    const id = randomUUID();
    const snapshotPool = [
      'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
      'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
      'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    ];
    const snapshotId = snapshotPool[i % snapshotPool.length];
    const camera = cameraPool[i % cameraPool.length];
    const user = userPool[i % userPool.length];
    const evType = types[i % types.length];
    const conf = +(0.5 + (i % 50) * 0.01).toFixed(2);
    const detectedAt = new Date(Date.UTC(2025, 8, (i % 28) + 1, i % 24, i % 60, 0));
    let detectionData: Record<string, any>;
    let aiAnalysis: Record<string, any> | null = null;
    let notes = '';
    let status: string = 'new';

    switch (evType) {
      case 'fall': {
        detectionData = {
          coords: {
            x: (i * 17) % 640,
            y: (i * 11) % 480,
            w: 70 + (i % 40),
            h: 110 + (i % 30),
          },
          impact: conf >= 0.85 ? 'high' : 'medium',
          duration: +(1.2 + (i % 6) * 0.3).toFixed(1),
        };
        aiAnalysis = { label: 'fall', severity: conf >= 0.9 ? 'critical' : 'high' };
        notes = conf >= 0.9 ? 'Cần kiểm tra ngay lập tức.' : 'Theo dõi thêm camera.';
        status = conf >= 0.88 ? 'danger' : 'warning';
        break;
      }
      case 'sleep': {
        detectionData = {
          stage: ['light_sleep', 'deep_sleep', 'rem'][i % 3],
          duration_minutes: 20 + (i % 180),
          movement_index: Number((0.04 + (i % 15) * 0.01).toFixed(2)),
        };
        aiAnalysis = {
          sleep_quality: conf >= 0.85 ? 'good' : conf >= 0.7 ? 'moderate' : 'poor',
          heart_rate_avg: 58 + (i % 18),
        };
        notes = 'Hệ thống ghi nhận giấc ngủ theo dõi sức khỏe.';
        status = 'normal';
        break;
      }
      case 'abnormal_behavior': {
        detectionData = {
          coords: {
            x: (i * 19) % 640,
            y: (i * 23) % 480,
            w: 65 + (i % 35),
            h: 95 + (i % 20),
          },
          anomaly_score: Number((0.5 + (i % 40) * 0.01).toFixed(2)),
        };
        aiAnalysis = { label: 'abnormal_behavior', pattern: ['wandering', 'staggering'][i % 2] };
        notes = 'Phát hiện hành vi bất thường cần caregiver xem lại.';
        status = conf >= 0.8 ? 'warning' : 'normal';
        break;
      }
      case 'emergency': {
        detectionData = {
          category: ['medical', 'fire_alarm', 'distress_call'][i % 3],
          metric: Number((0.7 + (i % 20) * 0.01).toFixed(2)),
        };
        aiAnalysis = { label: 'emergency', confidence: conf };
        notes = 'Cảnh báo khẩn cấp từ hệ thống cảm biến.';
        status = 'danger';
        break;
      }
      default: {
        detectionData = {
          coords: {
            x: (i * 13) % 640,
            y: (i * 7) % 480,
            w: 60 + (i % 50),
            h: 80 + (i % 60),
          },
          duration: +(5 + (i % 20)).toFixed(1),
        };
        notes = '';
        status = evType === 'normal_activity' ? 'normal' : conf >= 0.9 ? 'warning' : 'normal';
        break;
      }
    }

    const supplementId = supplementIdByUser.get(user) || null;
    const contextData = supplementId ? { supplement_id: supplementId } : null;

    const det = {
      idx: i,
      event_id: id,
      snapshot_id: snapshotId,
      camera_id: camera,
      user_id: user,
      event_type: evType,
      confidence_score: conf,
      detection_data: JSON.stringify(detectionData),
      detected_at: detectedAt.toISOString(),
      verified_by: null,
      verified_at: null,
      notes,
      bounding_boxes: null,
      ai_analysis_result: aiAnalysis ? JSON.stringify(aiAnalysis) : null,
      acknowledged_by: null,
      acknowledged_at: null,
      dismissed_at: null,
      status,
      confirm_status: null,
      context_data: contextData,
    };
    rawEventDetections.push(det);
  }
})();

const rawPatientHabits = [
  {
    idx: 0,
    habit_id: 'a7d3f8c4-4f6e-4b0a-9d2e-0f1a2b3c4d5e',
    habit_type: 'medication',
    habit_name: 'ACE inhibitor - buổi sáng',
    description: 'Uống Lisinopril 10mg sau bữa sáng để kiểm soát huyết áp',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Uống sau bữa sáng; ghi chép huyết áp trước và sau khi uống.',
    dose: '10mg',
    route: 'oral',
    prescriber: 'Bs. Trần Văn A',
    start_date: '2015-05-02',
    monitoring: 'Đo huyết áp trước và sau uống, ghi lại vào nhật ký',
    side_effects: 'Chóng mặt/tiêu chảy/ho khan (nếu xuất hiện báo BS)',
    reminder_method: 'app_notification',
    adherence_goal: '>=90%',
    is_active: true,
    created_at: '2025-09-01 07:30:00+07',
    updated_at: '2025-09-01 07:30:00+07',
    supplement_id: null,
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49', // customer1
  },
  {
    idx: 1,
    habit_id: 'b6c2e9d1-3a5b-4c1f-8e3a-1b2c3d4e5f60',
    habit_type: 'activity',
    habit_name: 'Đi bộ buổi chiều',
    description: 'Đi bộ nhanh 20-30 phút quanh khuôn viên để duy trì sức khỏe tim mạch',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Mang giày thể thao, mang theo nước, tránh nắng gắt.',
    is_active: true,
    created_at: '2025-09-02 16:30:00+07',
    updated_at: '2025-09-02 16:30:00+07',
    supplement_id: null,
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698', // customer2
  },
  {
    idx: 2,
    habit_id: 'c5b1d8e2-2b4c-4d2e-9a4b-2c3d4e5f6a70',
    habit_type: 'sleep',
    habit_name: 'Giấc ngủ buổi tối',
    description: 'Ngủ đều đặn, cố gắng 7-8 tiếng mỗi đêm để phục hồi',
    sleep_start: '22:30:00',
    sleep_end: '06:30:00',
    frequency: 'daily',
    days_of_week: null,
    notes: 'Tắt thiết bị điện tử 30 phút trước khi ngủ; giữ phòng tối và mát.',
    is_active: true,
    created_at: '2025-09-03 22:30:00+07',
    updated_at: '2025-09-03 22:30:00+07',
    supplement_id: null,
    user_id: '60779c5c-28f5-4848-a043-c6c9746d3504',
  },
  {
    idx: 200,
    habit_id: 'd2e4f6a8-7b9c-4a1d-8b2c-5d6e7f8a9b01',
    habit_type: 'sleep',
    habit_name: 'Giấc ngủ tối của John',
    description: 'Ngủ lúc 22:00, thức dậy lúc 06:00 để duy trì sức khỏe tim mạch.',
    sleep_start: '22:00:00',
    sleep_end: '06:00:00',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Hạn chế dùng thiết bị điện tử trước khi ngủ 30 phút.',
    is_active: true,
    created_at: '2025-09-10 21:30:00+07',
    updated_at: '2025-09-10 21:30:00+07',
    supplement_id: 'supp-1111-1111-1111-111111111111',
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
  },
  {
    idx: 201,
    habit_id: '9a8b7c6d-5e4f-4b3a-8c1d-0e1f2a3b4c5d',
    habit_type: 'sleep',
    habit_name: 'Ngủ trưa phục hồi',
    description: 'Ngủ trưa 30 phút sau bữa trưa để phục hồi sức khỏe.',
    sleep_start: '13:00:00',
    sleep_end: '13:30:00',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5]',
    notes: 'Đặt chuông nhẹ nhàng, giữ phòng thông thoáng.',
    is_active: true,
    created_at: '2025-09-11 13:00:00+07',
    updated_at: '2025-09-11 13:00:00+07',
    supplement_id: 'supp-5555-5555-5555-555555555555',
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc',
  },
  {
    idx: 3,
    habit_id: 'dd444444-4444-4444-4444-444444444444',
    habit_type: 'medication',
    habit_name: 'Insulin tối (PRN)',
    description: 'Tiêm insulin dưới da nếu đường huyết > 180 mg/dL theo chỉ định',
    frequency: 'daily',
    days_of_week: null,
    notes: 'Kiểm tra đường huyết trước khi tiêm; ghi liều đã tiêm vào nhật ký.',
    is_active: true,
    created_at: '2025-09-04 20:00:00+07',
    updated_at: '2025-09-04 20:00:00+07',
    supplement_id: null,
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc',
  },
  {
    idx: 4,
    habit_id: 'e4a0c7f3-1c3d-4e3f-8b5c-3d4e5f6a7b80',
    habit_type: 'activity',
    habit_name: 'Giãn cơ buổi sáng',
    description: 'Chuỗi bài giãn cơ nhẹ giúp cải thiện tư thế và giảm đau lưng',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5]',
    notes: 'Làm chậm, tập trung hít thở; nếu đau thì dừng.',
    is_active: true,
    created_at: '2025-09-05 07:15:00+07',
    updated_at: '2025-09-05 07:15:00+07',
    supplement_id: null,
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c1',
  },
  {
    idx: 5,
    habit_id: 'f3b9a6e4-0d2e-4f4a-9c6d-4e5f6a7b8c90',
    habit_type: 'medication',
    habit_name: 'Thuốc huyết áp trưa (as needed)',
    description: 'Uống thuốc huyết áp buổi trưa nếu có chỉ định/triệu chứng hoặc BP cao',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Uống sau bữa; theo dõi tác dụng phụ (choáng, mệt).',
    dose: null,
    route: null,
    prescriber: 'Bs. Nguyễn Thị B',
    start_date: '2025-09-01',
    monitoring: 'Ghi lại triệu chứng trong 48h nếu có tác dụng phụ',
    side_effects: 'Choáng, buồn nôn',
    reminder_method: 'caregiver_call',
    adherence_goal: 'as needed',
    is_active: true,
    created_at: '2025-09-06 12:00:00+07',
    updated_at: '2025-09-06 12:00:00+07',
    supplement_id: 'supp-1111-1111-1111-111111111111',
    user_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49',
  },
  {
    idx: 6,
    habit_id: 'gg777777-7777-7777-7777-777777777777',
    habit_type: 'activity',
    habit_name: 'Nhắc uống nước',
    description: 'Nhắc uống nước 200-250ml mỗi 2 giờ trong ngày để giữ đủ nước',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Nếu có vấn đề tim/thận, hỏi bác sĩ về lượng nước phù hợp.',
    is_active: true,
    created_at: '2025-09-06 10:00:00+07',
    updated_at: '2025-09-06 10:00:00+07',
    supplement_id: null,
    user_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e',
  },
  {
    idx: 7,
    habit_id: 'hh888888-8888-8888-8888-888888888888',
    habit_type: 'activity',
    habit_name: 'Vật lý trị liệu',
    description: 'Bài tập phục hồi chức năng theo hướng dẫn chuyên môn',
    frequency: 'weekly',
    days_of_week: '[2,4,6]',
    notes: 'Cần có người hỗ trợ; thực hiện theo giáo án của chuyên gia',
    is_active: true,
    created_at: '2025-09-07 15:00:00+07',
    updated_at: '2025-09-07 15:00:00+07',
    supplement_id: null,
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698',
  },
  {
    idx: 8,
    habit_id: 'ii999999-9999-9999-9999-999999999999',
    habit_type: 'medication',
    habit_name: 'Vitamin tổng hợp - sáng',
    description: 'Uống vitamin tổng hợp sau bữa sáng để bổ sung vi chất',
    frequency: 'daily',
    days_of_week: '[1,2,3,4,5,6,0]',
    notes: 'Uống cùng thức ăn để giảm buồn nôn và tăng hấp thu',
    dose: '1 viên',
    route: 'oral',
    prescriber: 'Bs. Lê Văn C',
    start_date: '2025-08-01',
    monitoring: 'Quan sát buồn nôn trong 24h đầu',
    side_effects: 'Buồn nôn nhẹ',
    reminder_method: 'calendar',
    adherence_goal: 'daily',
    is_active: true,
    created_at: '2025-09-08 08:30:00+07',
    updated_at: '2025-09-08 08:30:00+07',
    supplement_id: 'supp-5555-5555-5555-555555555555',
    user_id: '485b3c57-3e96-475e-a04d-7a9a637e1698',
  },
  {
    idx: 9,
    habit_id: 'jj000000-0000-0000-0000-000000000000',
    habit_type: 'sleep',
    habit_name: 'Ngủ trưa ngắn',
    description: 'Giấc ngủ trưa ngắn 20-30 phút để tăng tỉnh táo',
    sleep_start: '13:30:00',
    sleep_end: '14:00:00',
    frequency: 'daily',
    days_of_week: null,
    notes: 'Đặt báo thức để tránh ngủ quá dài; không ngủ ngay sau ăn no',
    is_active: true,
    created_at: '2025-09-09 13:30:00+07',
    updated_at: '2025-09-09 13:30:00+07',
    supplement_id: null,
    user_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e',
  },
];

// If you want more sample habits, generate them deterministically so IDs remain stable
(() => {
  const customers = rawUsers.filter((u) => u.role === 'customer').map((u) => u.user_id);
  if (!customers.length) return;
  const extraCount = 20;
  const types = ['activity', 'medication', 'sleep', 'activity'];
  for (let i = 0; i < extraCount; i++) {
    const user = customers[i % customers.length];
    const idx = rawPatientHabits.length + i;
    const habitName = `Auto habit ${idx}`;
    const habitType = types[i % types.length];
    const habitId = deterministicUuid(`habit:${habitName}:${user}`);
    rawPatientHabits.push({
      idx,
      habit_id: habitId,
      habit_type: habitType,
      habit_name: `${habitType === 'medication' ? 'Thuốc' : habitType === 'sleep' ? 'Giấc ngủ' : 'Hoạt động'} - ${idx}`,
      description:
        habitType === 'medication'
          ? 'Uống thuốc theo lịch (mẫu auto-generated)'
          : habitType === 'sleep'
            ? 'Ngủ ngắn/giấc ngủ tự động sinh'
            : 'Hoạt động thể chất nhẹ (mẫu auto-generated)',
      // For sleep-type, provide sleep_start/sleep_end; omit legacy fields for others
      ...(habitType === 'sleep'
        ? {
            sleep_start: i % 2 === 0 ? '09:00:00' : '21:00:00',
            sleep_end: i % 2 === 0 ? '10:00:00' : undefined,
          }
        : {}),
      frequency: 'daily',
      days_of_week: habitType === 'activity' ? '[1,3,5]' : '[1,2,3,4,5,6,0]',
      notes:
        habitType === 'medication'
          ? 'Liều: theo đơn; người kê đơn: không rõ (auto). Hướng dẫn: uống cùng thức ăn nếu dễ buồn nôn. Ghi lại tuân thủ.'
          : '',
      is_active: true,
      created_at: '2025-09-10 09:00:00+07',
      updated_at: '2025-09-10 09:00:00+07',
      supplement_id: null,
      user_id: user,
    } as any);
  }
})();

const rawPatientMedicalRecords = [
  {
    idx: 0,
    id: 'pmr-1111-1111-1111-111111111111',
    // More structured condition entries with onset/severity/status
    conditions: JSON.stringify([
      {
        name: 'tăng huyết áp',
        onset: '2015-05-01',
        severity: 'vừa',
        status: 'đang quản lý',
        notes: 'Đang dùng thuốc ức chế ACE, huyết áp được kiểm soát',
      },
      {
        name: 'tiểu đường type 2',
        onset: '2018-03-15',
        severity: 'nhẹ',
        status: 'đang quản lý',
        notes: 'Type 2 - quản lý bằng chế độ ăn và metformin',
      },
    ]),
    // medications removed from medical records; use care_plan or separate resource
    history: JSON.stringify(['2020: nhồi máu cơ tim', '2019: nhập viện vì viêm phổi']),
    updated_at: '2025-09-10 10:00:00+07',
    // Link to a patient_supplement (we'll create supplements below and reference by id)
    supplement_id: 'supp-2222-2222-2222-222222222222',
    // Care plan and recommended actions (kept as JSON to avoid schema changes)
    care_plan: JSON.stringify([
      {
        condition: 'tăng huyết áp',
        actions: [
          { action: 'Đo huyết áp hàng ngày', frequency: 'daily', responsible: 'bệnh nhân' },
          { action: 'Uống thuốc: Lisinopril 10mg', frequency: 'daily', responsible: 'bệnh nhân' },
          {
            action: 'Đánh giá với bác sĩ gia đình',
            frequency: 'monthly',
            responsible: 'người chăm sóc',
          },
        ],
      },
      {
        condition: 'tiểu đường type 2',
        actions: [
          {
            action: 'Đo đường huyết lúc đói hàng ngày',
            frequency: 'daily',
            responsible: 'bệnh nhân',
          },
          { action: 'Metformin 500mg', frequency: 'BID', responsible: 'bệnh nhân' },
          { action: 'Tư vấn dinh dưỡng', frequency: 'monthly', responsible: 'người chăm sóc' },
        ],
      },
    ]),
    last_reviewed: '2025-09-15T10:00:00+07',
  },
  {
    idx: 1,
    id: 'pmr-2222-2222-2222-222222222222',
    conditions: JSON.stringify([
      {
        name: 'hen suyễn',
        onset: '2010-06-01',
        severity: 'nhẹ',
        status: 'từng đợt',
        notes: 'Sử dụng ống hít khi cần (PRN)',
      },
    ]),
    // medications removed from medical records; use care_plan or separate resource
    history: JSON.stringify(['Hen tuổi thơ, phần lớn được kiểm soát ở tuổi trưởng thành']),
    updated_at: '2025-09-11 09:00:00+07',
    supplement_id: 'supp-1111-1111-1111-111111111111',
    care_plan: JSON.stringify([
      {
        condition: 'hen suyễn',
        actions: [
          { action: 'Mang ống hít Salbutamol', frequency: 'PRN', responsible: 'bệnh nhân' },
          {
            action: 'Tránh các yếu tố kích thích',
            frequency: 'continuous',
            responsible: 'người chăm sóc',
          },
          {
            action: 'Đánh giá hô hấp hàng năm',
            frequency: 'yearly',
            responsible: 'bác sĩ gia đình',
          },
        ],
      },
    ]),
    last_reviewed: '2025-09-12T09:00:00+07',
  },
];

// Patient supplements represent the patient profile (linked to a user/customer)
const rawPatientSupplements = [
  {
    idx: 0,
    id: 'supp-1111-1111-1111-111111111111',
    name: 'John Patient',
    dob: '1940-01-01',
    height_cm: 170,
    weight_kg: 68.5,
    created_at: '2025-09-01 09:00:00+07',
    updated_at: '2025-09-01 09:00:00+07',
    customer_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49', // customer1

    call_confirmed_until: null,
  },
  // Additional supplement provided (linked to John Patient)
  {
    idx: 999,
    id: 'af4cbcb9-c420-465e-8822-3fc8cededdb9',
    name: 'John Patient',
    dob: null,
    height_cm: null,
    weight_kg: null,
    created_at: '2025-09-01 09:00:00+07',
    updated_at: '2025-09-01 09:00:00+07',
    customer_id: '82f8c132-72e0-4c77-97a6-9c2a12dc1c49', // link to customer1 (John Patient)

    call_confirmed_until: null,
  },
  {
    idx: 1,
    id: 'supp-2222-2222-2222-222222222222',
    name: 'Anna Patient',
    dob: '1950-06-15',
    height_cm: 158,
    weight_kg: 62.0,
    created_at: '2025-09-02 10:00:00+07',
    updated_at: '2025-09-02 10:00:00+07',
    customer_id: '485b3c57-3e96-475e-a04d-7a9a637e1698', // customer2

    call_confirmed_until: null,
  },
  {
    idx: 2,
    id: 'supp-3333-3333-3333-333333333333',
    name: 'Michael Patient',
    dob: '1975-03-22',
    height_cm: 175,
    weight_kg: 80.2,
    created_at: '2025-09-03 11:00:00+07',
    updated_at: '2025-09-03 11:00:00+07',
    customer_id: '39517b85-6f8e-428e-b820-4e5ef9e48a5e', // user444

    call_confirmed_until: null,
  },
  {
    idx: 3,
    id: 'supp-4444-4444-4444-444444444444',
    name: 'Lan Patient',
    dob: '1962-12-05',
    height_cm: 162,
    weight_kg: 59.4,
    created_at: '2025-09-04 08:30:00+07',
    updated_at: '2025-09-04 08:30:00+07',
    customer_id: '5385c3cf-882e-4248-ae2d-704688fc1f85',

    call_confirmed_until: null,
  },
  {
    idx: 4,
    id: 'supp-5555-5555-5555-555555555555',
    name: 'Thi Patient',
    dob: '1980-07-10',
    height_cm: 168,
    weight_kg: 64.0,
    created_at: '2025-09-05 09:45:00+07',
    updated_at: '2025-09-05 09:45:00+07',
    customer_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc',

    call_confirmed_until: null,
  },
  {
    idx: 5,
    id: 'supp-6666-6666-6666-666666666666',
    name: 'Bao Patient',
    dob: '1958-11-30',
    height_cm: 160,
    weight_kg: 70.5,
    created_at: '2025-09-06 10:15:00+07',
    updated_at: '2025-09-06 10:15:00+07',
    customer_id: 'a584cf26-4883-4d26-b0b8-703c5ba61b96',

    call_confirmed_until: null,
  },
];

// Map supplements to prisma data shape
const patientSupplementsData = rawPatientSupplements
  .filter((s) => s.customer_id && TARGET_CUSTOMER_IDS.has(s.customer_id))
  .map((s) => ({
    id: normalizeSupplementId(s.id, s.customer_id),
    name: s.name,
    dob: s.dob ? normalizeDateTime(s.dob) : null,
    height_cm: typeof s.height_cm === 'number' ? s.height_cm : null,
    weight_kg: typeof s.weight_kg === 'number' ? s.weight_kg : null,
    created_at: normalizeDateTime(s.created_at) ?? new Date(),
    updated_at: normalizeDateTime(s.updated_at) ?? new Date(),
    users: s.customer_id ? undefined : undefined,
    // also store customer_id directly so createMany can be used (avoids nested connect in loops)
    customer_id: s.customer_id ? (ensureUuidMaybe(s.customer_id) ?? s.customer_id) : null,
    call_confirmed_until: s.call_confirmed_until ? normalizeDateTime(s.call_confirmed_until) : null,
  }));

for (const sup of patientSupplementsData) {
  TARGET_SUPPLEMENT_IDS.add(sup.id);
  const userId = (sup as any)?.users?.connect?.user_id;
  if (userId && !supplementIdByUser.has(userId)) supplementIdByUser.set(userId, sup.id);
}

const rawFcmTokens = [
  {
    idx: 0,
    token_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    user_id: '9943b3a7-ec53-4508-a9c2-39bda13ed6bc', // user111
    fcm_token: 'fGHI1234567890abcdefghijklmnopqrstuvwxyzABCDEF-smartphone',
    device_name: 'iPhone 14 Pro',
    platform: 'ios',
    is_active: true,
    last_used: '2025-09-17 10:00:00+07',
    created_at: '2025-09-10 15:30:00+07',
    updated_at: '2025-09-17 10:00:00+07',
  },
  {
    idx: 1,
    token_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    user_id: '24931cc6-4935-4b9e-a860-96b4e5cd7b7f', // caregiver01
    fcm_token: 'dEFG5678901234hijklmnopqrstuvwxyzABCDEF567890-android',
    device_name: 'Samsung Galaxy S24',
    platform: 'android',
    is_active: true,
    last_used: '2025-09-17 09:45:00+07',
    created_at: '2025-09-11 10:15:00+07',
    updated_at: '2025-09-17 09:45:00+07',
  },
  {
    idx: 2,
    token_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    user_id: '0a69c351-f39c-4b1f-90bb-76e7952400c2', // admin1
    fcm_token: 'bCDE9012345678klmnopqrstuvwxyzABCDEF123456789-web',
    device_name: 'Chrome Browser',
    platform: 'web',
    is_active: false,
    last_used: '2025-09-15 14:20:00+07',
    created_at: '2025-09-12 08:00:00+07',
    updated_at: '2025-09-15 14:20:00+07',
  },
];

const rawPlans = [
  {
    idx: 0,
    code: 'basic',
    name: 'Basic Plan',
    // plan with default free tier metadata
    price: 0,
    camera_quota: 1,
    retention_days: 30,
    caregiver_seats: 1,
    sites: 1,
    major_updates_months: 12,
    created_at: '2025-08-25 03:42:02.547822+07',
    storage_size: '5GB',
    is_recommended: false,
    tier: 1,
    currency: 'VND',
    status: 'available',
    is_current: true,
    version: 'v1.0',
    effective_from: '2025-09-14 07:00:00+07',
    effective_to: null,
  },
  {
    idx: 1,
    code: 'pro',
    name: 'Pro Plan',
    price: 150000,
    camera_quota: 4,
    retention_days: 30,
    caregiver_seats: 3,
    sites: 1,
    major_updates_months: 12,
    created_at: '2025-08-25 03:42:02.547822+07',
    storage_size: '50GB',
    is_recommended: true,
    tier: 2,
    currency: 'VND',
    status: 'available',
    is_current: true,
    version: 'v1.0',
    effective_from: '2025-09-14 07:00:00+07',
    effective_to: null,
  },
  {
    idx: 2,
    code: 'premium',
    name: 'Premium Plan',
    price: 300000,
    camera_quota: 6,
    retention_days: 30,
    caregiver_seats: 5,
    sites: 1,
    major_updates_months: 12,
    created_at: '2025-08-25 03:42:02.547822+07',
    storage_size: '150GB',
    is_recommended: false,
    tier: 3,
    currency: 'VND',
    status: 'available',
    is_current: true,
    version: 'v1.0',
    effective_from: '2025-09-14 07:00:00+07',
    effective_to: null,
  },
];

const rawRoles = [
  {
    idx: 0,
    id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    name: 'admin',
    description: 'Quản trị hệ thống với quyền truy cập đầy đủ',
    created_at: '2025-09-24 00:00:00+07',
    updated_at: '2025-09-24 00:00:00+07',
  },
  {
    idx: 1,
    id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    name: 'caregiver',
    description: 'Người chăm sóc có quyền truy cập bệnh nhân được phân công',
    created_at: '2025-09-24 00:00:00+07',
    updated_at: '2025-09-24 00:00:00+07',
  },
  {
    idx: 2,
    id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    name: 'customer',
    description: 'Khách hàng có quyền truy cập dữ liệu của chính họ',
    created_at: '2025-09-24 00:00:00+07',
    updated_at: '2025-09-24 00:00:00+07',
  },
];

const rawPermissions = [
  { idx: 0, id: '3f4a5b6c-7d8e-4f90-8a1b-3c4d5e6f7a8b', name: '*', description: 'Tất cả quyền' },
  {
    idx: 1,
    id: '4a5b6c7d-8e9f-4a01-9b2c-4d5e6f7a8b9c',
    name: 'read:events',
    description: 'Đọc sự kiện',
  },
  {
    idx: 2,
    id: '5b6c7d8e-9f01-4b12-ab3d-5e6f7a8b9c0d',
    name: 'read:alerts',
    description: 'Đọc cảnh báo',
  },
  {
    idx: 3,
    id: '6c7d8e9f-0102-4c23-8d4e-6f7a8b9c0d1e',
    name: 'read:patients',
    description: 'Đọc thông tin bệnh nhân',
  },
  {
    idx: 4,
    id: '7d8e9f01-0203-4d34-9e5f-7a8b9c0d1e2f',
    name: 'read:cameras',
    description: 'Đọc camera',
  },
  {
    idx: 5,
    id: '8e9f0102-0304-4e45-8f6a-8b9c0d1e2f3a',
    name: 'read:notifications',
    description: 'Đọc thông báo',
  },
  {
    idx: 6,
    id: '9f010203-0405-4f56-9a7b-9c0d1e2f3a4b',
    name: 'update:notifications',
    description: 'Cập nhật thông báo',
  },
  {
    idx: 7,
    id: 'a0102030-4050-4a67-8b8c-0d1e2f3a4b5c',
    name: 'read:health-reports',
    description: 'Đọc báo cáo sức khỏe',
  },
  {
    idx: 8,
    id: 'b0203041-5061-4b78-9c9d-1e2f3a4b5c6d',
    name: 'read:assignments',
    description: 'Đọc phân công',
  },
  {
    idx: 9,
    id: 'c1304052-6072-4c89-8dae-2f3a4b5c6d7e',
    name: 'read:shared-permissions',
    description: 'Đọc quyền chia sẻ',
  },
  {
    idx: 10,
    id: 'd2405063-7083-4d9a-9ebf-3a4b5c6d7e8f',
    name: 'create:assignments',
    description: 'Tạo phân công',
  },
  {
    idx: 11,
    id: 'e3506074-8094-4eab-8f01-4b5c6d7e8f90',
    name: 'manage:emergency-contacts',
    description: 'Quản lý liên hệ khẩn cấp',
  },
  {
    idx: 12,
    id: 'f4607085-90a5-4fbc-9a12-5c6d7e8f9012',
    name: 'create:users',
    description: 'Tạo người dùng',
  },
  {
    idx: 13,
    id: 'a5718096-01b6-4cde-8b23-6d7e8f901234',
    name: 'update:users',
    description: 'Cập nhật người dùng',
  },
  {
    idx: 14,
    id: 'b68290a7-12c7-4def-9c34-7e8f90123456',
    name: 'delete:users',
    description: 'Xóa người dùng',
  },
  {
    idx: 15,
    id: 'c793a1b8-23d8-4e01-8d45-8f9012345678',
    name: 'manage:roles',
    description: 'Quản lý vai trò',
  },
  {
    idx: 16,
    id: 'd8a4b2c9-34e9-4f12-9e56-90123456789a',
    name: 'manage:permissions',
    description: 'Quản lý quyền',
  },
  {
    idx: 17,
    id: 'e9b5c3da-45fa-4a23-8f67-0123456789ab',
    name: 'manage:plans',
    description: 'Quản lý gói dịch vụ',
  },
  {
    idx: 18,
    id: 'fab6d4eb-56ab-4b34-9f78-123456789abc',
    name: 'manage:subscriptions',
    description: 'Quản lý thuê bao',
  },
  {
    idx: 19,
    id: '0abcde12-67bc-4c45-8a89-23456789abcd',
    name: 'view:analytics',
    description: 'Xem phân tích hệ thống',
  },
  {
    idx: 20,
    id: '1bcdef23-78cd-4d56-9b9a-3456789abcde',
    name: 'manage:settings',
    description: 'Quản lý cài đặt hệ thống',
  },
];

const rawRolePermissions = [
  // Admin permissions - all permissions
  {
    role_id: 'afb4c9e8-5f42-4e12-9a3b-1f2d3c4b5a6e',
    permission_id: '3f4a5b6c-7d8e-4f90-8a1b-3c4d5e6f7a8b',
  },

  // Caregiver permissions
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: '4a5b6c7d-8e9f-4a01-9b2c-4d5e6f7a8b9c',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: '5b6c7d8e-9f01-4b12-ab3d-5e6f7a8b9c0d',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: '7d8e9f01-0203-4d34-9e5f-7a8b9c0d1e2f',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: '8e9f0102-0304-4e45-8f6a-8b9c0d1e2f3a',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: '9f010203-0405-4f56-9a7b-9c0d1e2f3a4b',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: 'a0102030-4050-4a67-8b8c-0d1e2f3a4b5c',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: 'b0203041-5061-4b78-9c9d-1e2f3a4b5c6d',
  },
  {
    role_id: 'bfc5da19-7a83-4f23-8b4c-2e3f4a5b6c7d',
    permission_id: 'c1304052-6072-4c89-8dae-2f3a4b5c6d7e',
  },

  // Customer permissions
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: '4a5b6c7d-8e9f-4a01-9b2c-4d5e6f7a8b9c',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: '5b6c7d8e-9f01-4b12-ab3d-5e6f7a8b9c0d',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: '7d8e9f01-0203-4d34-9e5f-7a8b9c0d1e2f',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: '8e9f0102-0304-4e45-8f6a-8b9c0d1e2f3a',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: '9f010203-0405-4f56-9a7b-9c0d1e2f3a4b',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: 'a0102030-4050-4a67-8b8c-0d1e2f3a4b5c',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: 'd2405063-7083-4d9a-9ebf-3a4b5c6d7e8f',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: 'b0203041-5061-4b78-9c9d-1e2f3a4b5c6d',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: 'e3506074-8094-4eab-8f01-4b5c6d7e8f90',
  },
  {
    role_id: 'c0d6eb2a-8b94-4a34-9c5d-3f4a5b6c7d8e',
    permission_id: 'c1304052-6072-4c89-8dae-2f3a4b5c6d7e',
  },
];

// --------------------- TRANSFORM FOR PRISMA ---------------------
const usersData = rawUsers.map((u) => ({
  user_id: u.user_id,
  username: u.username,
  email: u.email,
  password_hash: u.password_hash,
  full_name: u.full_name,
  role: u.role as $Enums.role_enum,
  date_of_birth: u.date_of_birth ? new Date(u.date_of_birth) : null,
  phone_number: u.phone_number ?? null,
  is_active: Boolean(u.is_active),
  created_at: normalizeDateTime(u.created_at) ?? new Date(),
  updated_at: normalizeDateTime(u.updated_at) ?? new Date(),
  otp_code: u.otp_code ?? null,
  otp_expires_at: normalizeDateTime(u.otp_expires_at),
}));

const plansData = rawPlans.map((p) => ({
  code: p.code ?? `plan_${String(p.idx ?? Math.random()).replace(/\W+/g, '_')}`,
  name: p.name ?? `Plan ${p.idx ?? 'default'}`,
  price: BigInt(p.price),
  camera_quota: p.camera_quota,
  retention_days: p.retention_days,
  caregiver_seats: p.caregiver_seats,
  sites: p.sites,
  major_updates_months: p.major_updates_months,
  created_at: normalizeDateTime(p.created_at) ?? new Date(),
  storage_size: p.storage_size ?? null,
  is_recommended: Boolean(p.is_recommended),
  tier: p.tier,
  currency: p.currency,
  status: p.status as $Enums.plan_status_enum,
  is_current: p.is_current ?? null,
  version: p.version ?? 'v1',
  effective_from: normalizeDateTime(p.effective_from),
  effective_to: normalizeDateTime(p.effective_to),
}));

const fcmTokensData = rawFcmTokens.map((t) => ({
  token_id: t.token_id,
  user_id: t.user_id,
  device_id: t.device_name ?? null,
  token: t.fcm_token,
  platform: t.platform as $Enums.push_platform_enum,
  app_version: null,
  device_model: null,
  os_version: null,
  topics: Prisma.DbNull,
  is_active: Boolean(t.is_active),
  last_used_at: normalizeDateTime(t.last_used),
  revoked_at: null,
  created_at: normalizeDateTime(t.created_at) ?? new Date(),
  updated_at: normalizeDateTime(t.updated_at) ?? new Date(),
}));

const camerasData = rawCameras.map((c) => ({
  camera_id: c.camera_id,
  user_id: c.user_id,
  camera_name: c.camera_name,
  camera_type: c.camera_type as $Enums.camera_type_enum,
  ip_address: c.ip_address ?? null,
  port: c.port ?? 80,
  rtsp_url: c.rtsp_url ?? null,
  username: c.username ?? null,
  password: c.password ?? null,
  location_in_room: c.location_in_room ?? null,
  resolution: c.resolution ?? null,
  fps: c.fps ?? 30,
  status: c.status as $Enums.camera_status_enum,
  last_ping: normalizeDateTime(c.last_ping),
  is_online: Boolean(c.is_online),
  last_heartbeat_at: normalizeDateTime(c.last_heartbeat_at),
  created_at: normalizeDateTime(c.created_at) ?? new Date(),
  updated_at: normalizeDateTime(c.updated_at) ?? new Date(),
}));

const snapshotsData = rawSnapshots.map((s) => ({
  snapshot_id: s.snapshot_id,
  camera_id: s.camera_id,
  user_id: s.user_id,
  capture_type: s.capture_type as $Enums.capture_type_enum,
  captured_at: normalizeDateTime(s.timestamp) ?? new Date(),
  processed_at: normalizeDateTime(s.created_at) ?? new Date(),
  is_processed: true,
  metadata: normalizeJson(s.metadata),
}));

const eventDetectionsData = rawEventDetections
  .filter((e) => TARGET_CUSTOMER_IDS.has(e.user_id))
  .map((e) => {
    const rawType = (e.event_type || '').toString().toLowerCase();
    const normalizedType = (() => {
      if (rawType === 'intrusion' || rawType === 'visitor_detected') return 'abnormal_behavior';
      if (rawType === 'fall_detection') return 'fall';
      const allowed = ['fall', 'abnormal_behavior', 'emergency', 'normal_activity', 'sleep'];
      return (allowed.includes(rawType) ? rawType : 'normal_activity') as $Enums.event_type_enum;
    })() as $Enums.event_type_enum;

    const detectedAt = normalizeDateTime(e.detected_at) ?? new Date();
    const confidence = parseConfidenceScore(e.confidence_score);
    const status = determineEventStatus(e, normalizedType, confidence);
    const description = buildEventDescription(e, normalizedType, status, confidence, detectedAt);

    // Map legacy verification fields into new canonical verification_status when possible
    const mappedVerificationStatus = e.verified_by
      ? ('APPROVED' as any)
      : typeof e.confirm_status === 'boolean'
        ? e.confirm_status
          ? ('APPROVED' as any)
          : ('REJECTED' as any)
        : undefined;

    return {
      event_id: e.event_id,
      snapshot_id: e.snapshot_id,
      camera_id: e.camera_id,
      user_id: e.user_id,
      event_type: normalizedType,
      event_description: description,
      confidence_score:
        (e as any).confidence_score != null ? String((e as any).confidence_score) : null,
      reliability_score:
        (e as any).reliability_score != null
          ? String((e as any).reliability_score)
          : (e as any).confidence_score != null
            ? String((e as any).confidence_score)
            : null,
      detection_data: normalizeJson(e.detection_data),
      detected_at: detectedAt,
      // Legacy verification fields (kept for compatibility)
      verified_by: e.verified_by ?? null,
      verified_at: normalizeDateTime(e.verified_at),
      // New canonical verification/escalation fields (map from legacy when available)
      verification_status: mappedVerificationStatus,
      last_action_by: e.verified_by ?? null,
      last_action_at: normalizeDateTime(e.verified_at) ?? null,
      notes: e.notes ?? null,
      bounding_boxes: e.bounding_boxes ? normalizeJson(e.bounding_boxes) : null,
      ai_analysis_result: e.ai_analysis_result ? normalizeJson(e.ai_analysis_result) : null,
      acknowledged_by: e.acknowledged_by ?? null,
      acknowledged_at: normalizeDateTime(e.acknowledged_at),
      dismissed_at: normalizeDateTime(e.dismissed_at),
      status: (status ?? null) as any as $Enums.event_status_enum,
      confirm_status: typeof e.confirm_status === 'boolean' ? e.confirm_status : null,
    };
  });

const eventIdsSeeded = new Set(eventDetectionsData.map((e) => e.event_id));

const notificationsData = rawNotifications
  .filter((n) => !n.event_id || eventIdsSeeded.has(n.event_id))
  .map((n: any) => {
    // Map legacy seed field `notification_type` to current schema `business_type`
    // Legacy `notification_type` in fixtures historically represented the channel (push/email/sms)
    const inferredChannel =
      n.notification_type === 'email'
        ? ('email' as $Enums.channel_enum)
        : n.notification_type === 'sms'
          ? ('sms' as $Enums.channel_enum)
          : ('push' as $Enums.channel_enum);

    const channel = (n.channel as unknown as $Enums.channel_enum) || inferredChannel;

    // business_type (purpose) was introduced later; for legacy notifications default to event_alert
    const businessType =
      (n.business_type as unknown as $Enums.notification_type_enum) ||
      ('event_alert' as $Enums.notification_type_enum);

    return {
      notification_id: n.notification_id,
      event_id: n.event_id ?? null,
      user_id: n.user_id,
      business_type: businessType as any,
      channel: channel,
      message: n.message,
      delivery_data: normalizeJson(n.delivery_data),
      status: n.status as $Enums.notif_status_enum,
      sent_at: normalizeDateTime(n.sent_at),
      delivered_at: normalizeDateTime(n.delivered_at),
      retry_count: n.retry_count ?? 0,
      error_message: n.error_message ?? null,
    };
  });

// Only include sleep-related habits in patientHabitsData per request
// Ensure every habit has a non-null `supplement_id` by falling back to an existing
// supplement id (round-robin) when one isn't provided in the raw data.
const _supplementIdsForFallback = patientSupplementsData.map((s) => s.id).filter(Boolean);
let _supplementFallbackIdx = 0;
const patientHabitsData = rawPatientHabits
  .filter((h) => TARGET_CUSTOMER_IDS.has(h.user_id))
  .filter((h) => (h.habit_type ? String(h.habit_type).toLowerCase() === 'sleep' : false))
  .map((h) => {
    // determine supplement id: prefer provided, otherwise fallback to round-robin from created supplements
    let supplementId: string | null = supplementIdByUser.get(h.user_id) ?? null;
    if (!supplementId && h.supplement_id)
      supplementId = normalizeSupplementId(h.supplement_id, h.user_id);
    if (!supplementId && _supplementIdsForFallback.length > 0) {
      supplementId =
        _supplementIdsForFallback[_supplementFallbackIdx % _supplementIdsForFallback.length];
      _supplementFallbackIdx++;
    }

    // compute sleep_start and sleep_end as Date objects when possible
    // Prefer explicit `sleep_start`/`sleep_end` from raw data (new format).
    let sleepStart: Date | null = null;
    let sleepEnd: Date | null = null;

    if ((h as any).sleep_start || (h as any).sleep_end) {
      // Accept either or both as HH:mm:ss strings (or full timestamps); interpret as TIME anchored to 1970-01-01
      if ((h as any).sleep_start) {
        sleepStart =
          normalizeDateTime(`1970-01-01 ${String((h as any).sleep_start).trim()}`) ?? null;
      }
      if ((h as any).sleep_end) {
        // If sleep_end looks like an early-morning time (less than sleep_start), we'll allow it to be on the next day
        let maybeEnd =
          normalizeDateTime(`1970-01-01 ${String((h as any).sleep_end).trim()}`) ?? null;
        if (maybeEnd && sleepStart && maybeEnd.getTime() <= sleepStart.getTime()) {
          // add one day to represent overnight end
          maybeEnd = new Date(maybeEnd.getTime() + 24 * 60 * 60 * 1000);
        }
        sleepEnd = maybeEnd;
      }
    }

    return {
      habit_id: ensureUuidMaybe(h.habit_id) ?? h.habit_id,
      // Force all seeded habits to be sleep-related per request
      habit_type: 'sleep' as $Enums.habit_type_enum,
      habit_name: h.habit_name,
      description: h.description ?? null,
      sleep_start: sleepStart,
      sleep_end: sleepEnd,
      frequency: h.frequency as $Enums.frequency_enum,
      days_of_week: mapDaysOfWeek(h.days_of_week),
      // location removed
      notes: h.notes ?? null,
      is_active: Boolean(h.is_active),
      created_at: normalizeDateTime(h.created_at) ?? new Date(),
      updated_at: normalizeDateTime(h.updated_at) ?? new Date(),
      supplement_id: supplementId,
      user_id: h.user_id ? (ensureUuidMaybe(h.user_id) ?? h.user_id) : h.user_id,
    };
  });

const patientMedicalRecordsData = rawPatientMedicalRecords
  .map((r) => {
    const normalizedSupp = r.supplement_id ? normalizeSupplementId(r.supplement_id, null) : null;
    return { record: r, normalizedSupp };
  })
  .filter(({ normalizedSupp }) => !normalizedSupp || TARGET_SUPPLEMENT_IDS.has(normalizedSupp))
  .map(({ record: r, normalizedSupp }) => {
    const conds = normalizeJson(r.conditions);
    const firstCond = Array.isArray(conds) && conds.length > 0 ? conds[0] : null;
    return {
      id: ensureUuidMaybe(r.id) ?? randomUUID(),
      name: firstCond?.name ?? null,
      notes: firstCond?.notes ?? null,
      history: normalizeJson(r.history),
      updated_at: normalizeDateTime(r.updated_at) ?? new Date(),
      supplement_id: normalizedSupp,
    };
  });

const rolesData = rawRoles.map((r) => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  created_at: normalizeDateTime(r.created_at) ?? new Date(),
  updated_at: normalizeDateTime(r.updated_at) ?? new Date(),
}));

const permissionsData = rawPermissions.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.description ?? null,
  created_at: new Date(),
  updated_at: new Date(),
}));

const rolePermissionsData = rawRolePermissions.map((rp) => ({
  role_id: rp.role_id,
  permission_id: rp.permission_id,
  assigned_at: new Date(),
}));

async function main() {
  console.log('🌱 Bắt đầu chạy seed dữ liệu...');

  try {
    // Clear existing data in proper order (due to foreign key constraints)
    console.log('🧹 Đang dọn dữ liệu cũ (nếu có)...');

    // Delete in proper order to avoid foreign key constraints
    try {
      await runWithReconnectSilent(async () => {
        await prisma.notifications.deleteMany();
        await prisma.events.deleteMany();
        await prisma.snapshots.deleteMany();
        await prisma.patient_habits.deleteMany();
        await prisma.device_tokens.deleteMany();
        await prisma.cameras.deleteMany();
        await prisma.access_grants.deleteMany();
        try {
          await prisma.system_config.deleteMany();
        } catch {
          console.log('ℹ️ system_config table not found or already empty');
        }
        try {
          await prisma.credential_images.deleteMany();
        } catch {
          console.log('ℹ️ credential_images table not found or already empty');
        }

        // Try to delete from other tables that might reference users
        try {
          await prisma.subscriptions.deleteMany();
        } catch {
          console.log('ℹ️ subscriptions table not found or already empty');
        }

        try {
          await prisma.support_tickets.deleteMany();
        } catch {
          console.log('ℹ️ support_tickets table not found or already empty');
        }

        try {
          await prisma.activity_logs.deleteMany();
        } catch {
          console.log('ℹ️ activity_logs table not found or already empty');
        }

        // Try to delete patient_sleep_checkins (legacy table) before users to avoid FK constraint
        try {
          await runWithReconnectSilent(async () => {
            if ((prisma as any).patient_sleep_checkins?.deleteMany) {
              await (prisma as any).patient_sleep_checkins.deleteMany();
            }
          });
        } catch {
          // not critical if table doesn't exist
          console.log('ℹ️ patient_sleep_checkins table not found or already empty');
        }

        // Ensure any legacy tables referencing users are cleared before deleting users
        try {
          await runWithReconnectSilent(async () => {
            // add other legacy clears here if needed in future
          });
        } catch {}

        await prisma.users.deleteMany();
        await prisma.plans.deleteMany();
      });
    } catch (error: any) {
      console.log('⚠️ Một số lỗi khi xóa dữ liệu, tiếp tục seed...', error?.message || error);
    } // Seed in proper order
    console.log('📦 Tạo/đảm bảo các gói dịch vụ (plans)...');
    await prisma.plans.createMany({ data: plansData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${plansData.length} gói dịch vụ`);

    console.log('👥 Tạo/đảm bảo người dùng (users)...');
    await prisma.users.createMany({ data: usersData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${usersData.length} người dùng`);

    console.log('📹 Tạo/đảm bảo camera...');
    await prisma.cameras.createMany({ data: camerasData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${camerasData.length} camera`);

    console.log('📱 Tạo/đảm bảo FCM tokens...');
    await prisma.device_tokens.createMany({ data: fcmTokensData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${fcmTokensData.length} FCM tokens`);

    console.log('🖼️ Tạo/đảm bảo snapshots...');
    const cameraIds = new Set(camerasData.map((c) => c.camera_id));
    const validSnapshots = snapshotsData.filter((s) => cameraIds.has(s.camera_id));
    const skipped = snapshotsData.length - validSnapshots.length;
    if (skipped > 0) {
      console.log(`⚠️ Bỏ qua ${skipped} snapshot(s) vì camera_id không tồn tại trong fixtures`);
    }
    if (validSnapshots.length) {
      await prisma.snapshots.createMany({ data: validSnapshots, skipDuplicates: true });
    } else {
      console.log('ℹ️ Không có snapshot hợp lệ để tạo');
    }
    console.log(`✅ Đã tạo/kiểm tra ${validSnapshots.length} ảnh chụp`);

    // Build snapshotIds set for later validations
    const snapshotIds = new Set(validSnapshots.map((s) => s.snapshot_id));

    console.log('🧾 Tạo/đảm bảo patient_supplements...');
    // Only create supplements for users that exist in fixtures to avoid FK errors
    const userIds = new Set(usersData.map((u) => u.user_id));
    const validSupplements = patientSupplementsData.filter((s) => {
      const uid = (s as any)?.users?.connect?.user_id;
      return uid ? userIds.has(uid) : false;
    });
    const skippedSupp = patientSupplementsData.length - validSupplements.length;
    if (skippedSupp > 0) {
      console.log(
        `⚠️ Bỏ qua ${skippedSupp} patient_supplement(s) vì user_id không tồn tại trong fixtures`,
      );
    }
    let suppCreated = 0;
    if (validSupplements.length) {
      // Prepare flat objects suitable for createMany (avoid nested connect calls)
      const supplementsToCreate = validSupplements.map((s) => ({
        id: (s as any).id,
        name: (s as any).name ?? null,
        dob: (s as any).dob ?? null,
        height_cm: (s as any).height_cm ?? null,
        weight_kg: (s as any).weight_kg ?? null,
        created_at: (s as any).created_at ?? new Date(),
        updated_at: (s as any).updated_at ?? new Date(),
        customer_id: (s as any).customer_id ?? null,
        call_confirmed_until: (s as any).call_confirmed_until ?? null,
      }));
      try {
        await runWithReconnectSilent(() =>
          prisma.patient_supplements.createMany({
            data: supplementsToCreate as any,
            skipDuplicates: true,
          }),
        );
        suppCreated = supplementsToCreate.length;
      } catch (err: any) {
        console.log(
          '⚠️ Failed to bulk create patient_supplements, falling back to per-item:',
          err?.message || err,
        );
        // Fallback to per-item creates with reconnects
        for (const s of validSupplements) {
          try {
            await runWithReconnect(() => prisma.patient_supplements.create({ data: s as any }));
            await sleep(20);
            suppCreated++;
          } catch (err: any) {
            if (err?.code === 'P2002') continue;
            console.log('⚠️ Failed to create patient_supplement:', s.id, err?.message || err);
          }
        }
      }
    }
    console.log(
      `✅ Tạo ~${suppCreated} patient_supplements (attempted ${validSupplements.length})`,
    );

    console.log('🧾 Tạo/đảm bảo patient_habits...');
    let existingSupplements: Array<{ id: string }> = [];
    try {
      existingSupplements = await runWithReconnectSilent(() =>
        prisma.patient_supplements.findMany({ select: { id: true } }),
      );
    } catch (e: any) {
      console.log(
        '⚠️ Failed to fetch patient_supplements after retries; proceeding with what we have',
        e?.message || e,
      );
    }
    const supplementIds = new Set(existingSupplements.map((x) => x.id));
    const validHabits = patientHabitsData.filter((h) =>
      h.supplement_id ? supplementIds.has(h.supplement_id) : true,
    );
    const skippedHabits = patientHabitsData.length - validHabits.length;
    if (skippedHabits > 0) {
      console.log(`⚠️ Bỏ qua ${skippedHabits} patient_habit(s) vì supplement_id không tồn tại`);
    }
    let createdCount = 0;
    for (const h of validHabits) {
      try {
        // If explicit habit_id provided, upsert by PK to be idempotent
        if (h.habit_id) {
          await runWithReconnectSilent(() =>
            prisma.patient_habits.upsert({
              where: { habit_id: h.habit_id },
              update: h as any,
              create: h as any,
            }),
          );
          await sleep(25);
          // count as created if it did not exist (best-effort, skip precise detection)
          createdCount++;
          continue;
        }

        // If supplement_id provided, try to update latest existing habit for this supplement
        if (h.supplement_id) {
          const existing = await runWithReconnectSilent(() =>
            prisma.patient_habits.findFirst({
              where: { supplement_id: h.supplement_id },
              orderBy: { created_at: 'desc' },
            }),
          );
          if (existing) {
            await runWithReconnectSilent(() =>
              prisma.patient_habits.update({
                where: { habit_id: existing.habit_id },
                data: h as any,
              }),
            );
            await sleep(25);
            continue;
          }
        }

        // Fallback: create new habit
        await runWithReconnectSilent(() => prisma.patient_habits.create({ data: h as any }));
        await sleep(25);
        createdCount++;
      } catch (err: any) {
        if (err?.code === 'P2002') continue; // skip duplicates if any
        console.log(
          '⚠️ Failed to create/update patient_habit:',
          h.habit_id || h.supplement_id,
          err?.message || err,
        );
      }
    }
    console.log(
      `✅ Đã tạo/kiểm tra ~${createdCount} patient_habits (thử ${patientHabitsData.length})`,
    );

    // --- Tạo 1 bản ghi mẫu (idempotent) để dễ kiểm thử manual / QA
    // Mục tiêu: nếu chưa có một patient_habit tên 'Sample - Uống thuốc sáng' cho 1 khách hàng,
    // thì tạo 1 bản ghi chuẩn để dev/qa dễ kiểm tra. Không ghi đè nếu đã tồn tại.
    try {
      const sampleUser = await prisma.users.findFirst({ where: { role: 'customer' } });
      const sampleSupplement = await prisma.patient_supplements.findFirst();
      if (sampleUser && sampleSupplement) {
        const exists = await prisma.patient_habits.findFirst({
          where: { user_id: sampleUser.user_id, habit_name: 'Sample - Uống thuốc sáng' },
        });
        if (!exists) {
          await prisma.patient_habits.create({
            data: {
              habit_type: 'sleep' as $Enums.habit_type_enum,
              habit_name: 'Giấc ngủ buổi tối (mẫu)',
              description: 'Ngủ trưa hoặc ngủ tối theo lịch - bản mẫu kiểm thử',
              sleep_start: new Date('1970-01-01T22:30:00Z'),
              sleep_end: new Date('1970-01-02T06:30:00Z'),
              frequency: 'daily' as $Enums.frequency_enum,
              days_of_week: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
              notes: 'Mẫu: đảm bảo yên tĩnh, tắt đèn trước khi ngủ',
              is_active: true,
              supplement_id: sampleSupplement.id,
              user_id: sampleUser.user_id,
            },
          });
          console.log('✅ Tạo bản ghi mẫu patient_habit (dễ hiểu cho QA/dev).');
        } else {
          console.log('ℹ️ Bản ghi mẫu đã tồn tại, giữ nguyên.');
        }
      } else {
        console.log(
          'ℹ️ Không tìm thấy user (customer) hoặc patient_supplements — bỏ qua tạo bản ghi mẫu.',
        );
      }
    } catch (err: any) {
      console.log('⚠️ Lỗi khi tạo sample patient_habit:', err?.message || err);
    }

    console.log('🎯 Tạo/đảm bảo events...');
    // Filter event detections to those referencing existing cameras and snapshots
    const validEventDetections = eventDetectionsData.filter(
      (e) => cameraIds.has(e.camera_id) && snapshotIds.has(e.snapshot_id),
    );
    const skippedEvents = eventDetectionsData.length - validEventDetections.length;
    if (skippedEvents > 0) {
      console.log(
        `⚠️ Bỏ qua ${skippedEvents} event detection(s) vì camera_id hoặc snapshot_id không tồn tại`,
      );
    }
    // Use batched createMany to avoid long-running prepared statement issues.
    // createMany is faster and reduces the number of prepared statements used by Prisma.
    const chunkSize = 50;
    let edInserted = 0;
    for (let i = 0; i < validEventDetections.length; i += chunkSize) {
      const chunk = validEventDetections.slice(i, i + chunkSize);

      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          await prisma.events.createMany({ data: chunk as any, skipDuplicates: true });
          edInserted += chunk.length;
          break;
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if (msg.includes('prepared statement') || err?.code === '26000') {
            attempt++;
            console.log(
              `⚠️ Transient DB error while inserting events chunk (attempt ${attempt}/${maxAttempts}): ${msg}. Reconnecting and retrying...`,
            );
            try {
              await prisma.$disconnect();
            } catch {}
            await prisma.$connect();
            if (attempt >= maxAttempts) {
              console.log('❌ Exceeded retries for this events chunk, skipping chunk.');
              break;
            }
            continue;
          }
          // Non-transient error: log and skip these events
          console.log(
            '⚠️ Failed to create events chunk:',
            chunk.map((c) => c.event_id).join(','),
            err?.message || err,
          );
          break;
        }
      }
    }
    console.log(
      `✅ Đã xử lý ~${edInserted}/${validEventDetections.length} events (thử ${validEventDetections.length})`,
    );

    // Build set of event ids that were intended to be created so notifications can reference them safely
    const eventIds = new Set(validEventDetections.map((e) => e.event_id));

    // Alerts model was merged into notifications in schema; migrate alerts -> notifications if needed
    console.log('ℹ️ Skipping alerts seeding (merged into notifications)');

    console.log('🔔 Tạo/đảm bảo notifications...');
    // Only create notifications that reference existing events
    const validNotifications = notificationsData.filter(
      (n) => !n.event_id || eventIds.has(n.event_id),
    );
    const skippedNotifs = notificationsData.length - validNotifications.length;
    if (skippedNotifs > 0) {
      console.log(`⚠️ Bỏ qua ${skippedNotifs} notification(s) vì event_id không tồn tại`);
    }
    if (validNotifications.length) {
      await prisma.notifications.createMany({ data: validNotifications, skipDuplicates: true });
    } else {
      console.log('ℹ️ Không có notification hợp lệ để tạo');
    }
    console.log(`✅ Đã tạo/kiểm tra ${validNotifications.length} thông báo`);

    // --------------------- Suggestions sample seeding ---------------------
    try {
      console.log('💡 Tạo/đảm bảo sample suggestions (AI suggestions)');
      // pick a sample customer from fixtures
      const sampleUserId = '37cbad15-483d-42ff-b07d-fbf3cd1cc863';
      const now = new Date();
      const suggestionsData: any[] = [
        {
          suggestion_id: deterministicUuid(`suggestion:fall1:${sampleUserId}`),
          user_id: sampleUserId,
          resource_type: 'room',
          resource_id: 'cam-1',
          type: 'fallRisk',
          title: 'Kiểm tra thảm trơn phòng khách',
          message: 'AI ghi nhận nhiều cảnh báo té ở một vị trí.',
          meta: {
            bullets: [
              'Giảm 40–60% nguy cơ té ngã.',
              'Giảm cảnh báo sai.',
              'AI nhận diện hành vi chính xác hơn.',
            ],
          },
          status: 'ACTIVE',
          next_notify_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          suggestion_id: deterministicUuid(`suggestion:fall2:${sampleUserId}`),
          user_id: sampleUserId,
          resource_type: 'hall',
          resource_id: 'cam-2',
          type: 'fallRisk',
          title: 'Sắp lại đồ đạc khu vực hành lang',
          message: 'Phát hiện 8 cảnh báo bất thường trong 3 ngày qua ở hành lang.',
          meta: {
            bullets: [
              'Tạo lối đi rõ ràng, an toàn hơn.',
              'Giảm vật cản gây nguy hiểm.',
              'Cải thiện độ chính xác của AI.',
            ],
          },
          status: 'ACTIVE',
          next_notify_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          suggestion_id: deterministicUuid(`suggestion:fall3:${sampleUserId}`),
          user_id: sampleUserId,
          resource_type: 'room',
          resource_id: 'cam-3',
          type: 'fallRisk',
          title: 'Tăng ánh sáng buổi tối',
          message: 'Nhiều cảnh báo xảy ra trong điều kiện thiếu sáng.',
          meta: {
            bullets: [
              'Giảm nguy cơ té khi di chuyển ban đêm.',
              'Giúp AI nhận diện chính xác hơn.',
              'Người chăm sóc dễ quan sát hơn.',
            ],
          },
          status: 'ACTIVE',
          next_notify_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          suggestion_id: deterministicUuid(`suggestion:device2:${sampleUserId}`),
          user_id: sampleUserId,
          resource_type: 'room',
          resource_id: 'cam-4',
          type: 'deviceCheck',
          title: 'Cải thiện ánh sáng phòng ngủ',
          message: 'AI confidence thấp do thiếu sáng, chỉ đạt 62%.',
          meta: {
            bullets: [
              'Tăng độ chính xác lên 85-95%.',
              'Giảm false alarm đáng kể.',
              'Phát hiện bất thường nhanh hơn.',
            ],
          },
          status: 'ACTIVE',
          next_notify_at: now,
          created_at: now,
          updated_at: now,
        },
        {
          suggestion_id: deterministicUuid(`suggestion:sleep2:${sampleUserId}`),
          user_id: sampleUserId,
          resource_type: 'bedroom',
          resource_id: 'cam-5',
          type: 'sleepQuality',
          title: 'Ngủ thêm 1-2 giờ mỗi đêm',
          message: 'Thời gian ngủ trung bình chỉ 5.2 giờ/đêm trong tuần qua.',
          meta: {
            bullets: [
              'Thiếu ngủ làm giảm khả năng phản ứng.',
              'Tăng nguy cơ ngã và tai nạn.',
              'Suy giảm trí nhớ và miễn dịch.',
            ],
          },
          status: 'ACTIVE',
          next_notify_at: now,
          created_at: now,
          updated_at: now,
        },
      ];

      // insert suggestions in small chunks
      const chunkSize = 10;
      for (let i = 0; i < suggestionsData.length; i += chunkSize) {
        const chunk = suggestionsData.slice(i, i + chunkSize);
        try {
          await prisma.suggestions.createMany({ data: chunk, skipDuplicates: true });
        } catch (err: any) {
          console.log('⚠️ Failed to create suggestions chunk:', err?.message || err);
        }
      }
      console.log(`✅ Đã tạo/kiểm tra ${suggestionsData.length} suggestions (sample)`);
    } catch (err: any) {
      console.log('⚠️ Lỗi khi seed suggestions:', err?.message || err);
    }

    console.log('🩺 Tạo/đảm bảo hồ sơ y tế bệnh nhân (patient_medical_histories)...');
    // Ensure we only attempt to create medical records that reference existing supplements
    let existingSupps: Array<{ id: string }> = [];
    try {
      existingSupps = await runWithReconnectSilent(() =>
        prisma.patient_supplements.findMany({ select: { id: true } }),
      );
    } catch (e: any) {
      console.log(
        '⚠️ Failed to fetch patient_supplements after retries; proceeding with what we have',
        e?.message || e,
      );
    }
    const existingSuppIds = new Set(existingSupps.map((s) => s.id));
    const validMedicalRecords = patientMedicalRecordsData.filter(
      (r) => !r.supplement_id || existingSuppIds.has(r.supplement_id),
    );
    const skippedMedical = patientMedicalRecordsData.length - validMedicalRecords.length;
    if (skippedMedical > 0) {
      console.log(
        `⚠️ Bỏ qua ${skippedMedical} patient_medical_histories vì supplement_id không tồn tại`,
      );
    }
    let pmrCreated = 0;
    for (const r of validMedicalRecords) {
      try {
        await prisma.patient_medical_histories.create({ data: r as any });
        pmrCreated++;
      } catch (err: any) {
        if (err?.code === 'P2002') continue;
        console.log('⚠️ Failed to create patient_medical_record:', r.id, err?.message || err);
      }
    }
    console.log(
      `✅ Đã tạo ~${pmrCreated} patient_medical_histories (thử ${patientMedicalRecordsData.length})`,
    );

    // --------------------- Patient sleep checkins seeding ---------------------
    console.log('🛌 Tạo/đảm bảo patient_sleep_checkins mẫu cho một số user...');
    try {
      const usersToSeed = Array.from(TARGET_CUSTOMER_IDS);
      const days = 7; // create last 7 days
      const now = new Date();
      const sleepRows: any[] = [];
      for (const uid of usersToSeed) {
        // For each user, try to find a representative habit and medical history to link
        const [latestHabit, latestMedical] = await Promise.all([
          runWithReconnectSilent(() =>
            prisma.patient_habits.findFirst({
              where: { user_id: uid },
              orderBy: { created_at: 'desc' },
            }),
          ),
          prisma.patient_medical_histories
            .findFirst({ orderBy: { updated_at: 'desc' } })
            .catch(() => null),
        ]);

        // If patient_medical_histories table doesn't have direct user_id, try to find one by supplement->users relation
        let medicalHistory = latestMedical as any;
        if (!medicalHistory) {
          // try find any medical history linked to this user's supplements
          try {
            const supp = await prisma.patient_supplements.findFirst({
              where: { customer_id: uid },
            });
            if (supp) {
              medicalHistory = await prisma.patient_medical_histories.findFirst({
                where: { supplement_id: supp.id },
                orderBy: { updated_at: 'desc' },
              });
            }
          } catch {
            medicalHistory = null;
          }
        }

        for (let i = 0; i < days; i++) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          // zero time portion for date-only field
          const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          // simple state mapping: alternate 'good' / 'poor' for variety
          const state = i % 2 === 0 ? 'good' : 'poor';
          const meta = {
            duration_minutes: 420 - i * 10,
            notes: i === 0 ? 'Auto-seeded latest' : null,
          };
          sleepRows.push({
            user_id: uid,
            checkin_at: dateOnly,
            state,
            meta,
            habit_id: latestHabit ? latestHabit.habit_id : undefined,
            medical_history_id: medicalHistory ? medicalHistory.id : undefined,
            created_at: new Date(),
            updated_at: new Date(),
          });
        }
      }

      // Use createMany with skipDuplicates to avoid errors on re-run
      if (sleepRows.length) {
        // chunk to avoid too large single insert
        const chunkSize = 100;
        for (let i = 0; i < sleepRows.length; i += chunkSize) {
          const chunk = sleepRows.slice(i, i + chunkSize);
          try {
            await (prisma as any).patient_sleep_checkins.createMany({
              data: chunk,
              skipDuplicates: true,
            } as any);
          } catch (err: any) {
            console.log('⚠️ Lỗi khi tạo patient_sleep_checkins chunk:', err?.message || err);
          }
        }
      }
      console.log(`✅ Đã seed ${sleepRows.length} patient_sleep_checkins (mẫu)`);
    } catch (err: any) {
      console.log('⚠️ Lỗi khi seed patient_sleep_checkins:', err?.message || err);
    }

    console.log('✉️ Tạo/đảm bảo email templates...');
    await prisma.mail_templates.createMany({
      data: [
        {
          name: 'Đặt lại mật khẩu',
          type: 'password_reset',
          subject_template: 'Đặt lại mật khẩu - Healthcare Vision',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Yêu cầu đặt lại mật khẩu</h2>
              <p>Xin chào {{userName}},</p>
              <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấn nút bên dưới để tiếp tục:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{resetUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Đặt lại mật khẩu
                </a>
              </div>
              <p>Liên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.</p>
              <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Đây là email tự động từ Healthcare Vision. Vui lòng không trả lời email này.
              </p>
            </div>
          `,
          text_template: `Xin chào {{userName}},\n\nBạn đã yêu cầu đặt lại mật khẩu. Vui lòng truy cập liên kết sau để đặt lại mật khẩu:\n\n{{resetUrl}}\n\nLiên kết này sẽ hết hạn sau 1 giờ vì lý do bảo mật.\n\nNếu bạn không yêu cầu, vui lòng bỏ qua email này.`,
          variables: ['userName', 'resetUrl'],
        },
        {
          name: 'Email chào mừng',
          type: 'welcome',
          subject_template: 'Chào mừng đến Healthcare Vision!',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Chào mừng đến Healthcare Vision!</h2>
              <p>Xin chào {{userName}},</p>
              <p>Cảm ơn bạn đã đăng ký Healthcare Vision! Tài khoản của bạn đã được tạo thành công.</p>
              <p>Bạn có thể:</p>
              <ul>
                <li>Truy cập bảng điều khiển chăm sóc sức khỏe</li>
                <li>Quản lý hồ sơ y tế của bạn</li>
                <li>Nhận thông báo sức khỏe quan trọng</li>
                <li>Kết nối với nhân viên y tế của bạn</li>
              </ul>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{appUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Bắt đầu
                </a>
              </div>
              <p>Nếu bạn có thắc mắc, vui lòng liên hệ đội ngũ hỗ trợ của chúng tôi.</p>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Đây là email tự động từ Healthcare Vision. Vui lòng không trả lời email này.
              </p>
            </div>
          `,
          text_template: `Xin chào {{userName}},\n\nCảm ơn bạn đã đăng ký Healthcare Vision! Tài khoản của bạn đã được tạo thành công.\n\nBạn có thể truy cập bảng điều khiển và quản lý hồ sơ y tế của mình.\n\nBắt đầu: {{appUrl}}`,
          variables: ['userName', 'appUrl'],
        },
        {
          name: 'Thông báo hết hạn gói dịch vụ',
          type: 'subscription_expiry',
          subject_template: '[{{status}}] Gói dịch vụ {{planName}} - {{message}}',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Thông báo gói dịch vụ</h2>
              <p>Kính chào Quý khách <b>{{userName}}</b>,</p>
              <p>{{content}}</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Gói dịch vụ:</strong> {{planName}}<br>
                <strong>Ngày hết hạn:</strong> {{expiryDate}}<br>
                <strong>Thời gian còn lại:</strong> {{daysLeft}} ngày
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{renewalUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Gia hạn ngay
                </a>
              </div>
              <p>Trân trọng,</p>
              <p><b>Đội ngũ hỗ trợ Healthcare VisionAI</b></p>
            </div>
          `,
          text_template: `Kính chào {{userName}},\n\n{{content}}\n\nGói dịch vụ: {{planName}}\nNgày hết hạn: {{expiryDate}}\nThời gian còn lại: {{daysLeft}} ngày\n\nGia hạn ngay: {{renewalUrl}}\n\nTrân trọng,\nĐội ngũ hỗ trợ Healthcare VisionAI`,
          variables: [
            'userName',
            'planName',
            'expiryDate',
            'daysLeft',
            'content',
            'status',
            'message',
            'renewalUrl',
          ],
        },
        {
          name: 'Cảnh báo bảo mật',
          type: 'security_alert',
          subject_template: 'Cảnh báo bảo mật - Healthcare Vision',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc3545;">Cảnh báo bảo mật</h2>
              <p>Xin chào {{userName}},</p>
              <p>Chúng tôi phát hiện hoạt động liên quan đến bảo mật trên tài khoản của bạn:</p>
              <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <strong>Hành động:</strong> {{action}}<br>
                <strong>Chi tiết:</strong> {{details}}<br>
                <strong>Thời gian:</strong> {{timestamp}}
              </div>
              <p>Nếu đó là bạn, không cần thực hiện gì thêm. Nếu bạn không nhận ra hoạt động này, vui lòng:</p>
              <ol>
                <li>Đổi mật khẩu ngay lập tức</li>
                <li>Kiểm tra cài đặt tài khoản</li>
                <li>Liên hệ đội ngũ hỗ trợ nếu cần trợ giúp</li>
              </ol>
              <div style="text-align: center; margin: 30px 0;">
                <a href="{{settingsUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Kiểm tra cài đặt bảo mật
                </a>
              </div>
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">
                Đây là thông báo bảo mật tự động từ Healthcare Vision.
              </p>
            </div>
          `,
          text_template: `Xin chào {{userName}},\n\nCảnh báo bảo mật: {{action}}\n\nChi tiết: {{details}}\n\nThời gian: {{timestamp}}\n\nNếu không phải bạn, vui lòng đổi mật khẩu và liên hệ hỗ trợ.`,
          variables: ['userName', 'action', 'details', 'timestamp', 'settingsUrl'],
        },
        // Default: appointment confirmation
        {
          name: 'Xác nhận lịch hẹn',
          type: 'appointment_confirmation',
          subject_template: 'Xác nhận lịch hẹn - {{clinic.name}}',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Xác nhận lịch hẹn</h2>
              <p>Xin chào {{patient.name}},</p>
              <p>Đơn vị: <strong>{{clinic.name}}</strong></p>
              <p>Thời gian: <strong>{{appointment.date}}</strong></p>
              <p>Địa điểm: <strong>{{appointment.location}}</strong></p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="{{appointment.url}}" style="background-color: #007bff; color: white; padding: 10px 18px; text-decoration: none; border-radius: 5px;">Xem chi tiết</a>
              </div>
              <p>Nếu bạn cần thay đổi lịch hẹn, vui lòng liên hệ đơn vị cung cấp dịch vụ.</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">Đây là email tự động từ Healthcare Vision.</p>
            </div>
          `,
          text_template: `Xin chào {{patient.name}},\n\nLịch hẹn của bạn tại {{clinic.name}} vào {{appointment.date}} tại {{appointment.location}}.\n\nXem chi tiết: {{appointment.url}}\n\nTrân trọng,\nHealthcare Vision`,
          variables: [
            'patient.name',
            'clinic.name',
            'appointment.date',
            'appointment.location',
            'appointment.url',
          ],
        },
        // Default: doctor message template used when sending messages to doctors
        {
          name: 'Tin nhắn bác sĩ',
          type: 'doctor_message',
          subject_template: 'Tin nhắn từ bác sĩ {{doctor.name}}',
          html_template: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Tin nhắn từ bác sĩ {{doctor.name}}</h2>
              <p>Kính gửi {{patient.name}},</p>
              <div style="background:#f8f9fa;padding:12px;border-radius:6px;margin:12px 0;">
                {{{message_html}}}
              </div>
              <p>Liên hệ bác sĩ: {{doctor.email}}</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 12px;">Đây là email tự động từ Healthcare Vision.</p>
            </div>
          `,
          text_template: `Kính gửi {{patient.name}},\n\n{{message_text}}\n\nLiên hệ bác sĩ: {{doctor.email}}\n\nTrân trọng,\nHealthcare Vision`,
          variables: [
            'doctor.name',
            'doctor.email',
            'patient.name',
            'message_html',
            'message_text',
          ],
        },
      ],
      skipDuplicates: true,
    });
    console.log(`✅ Đã tạo/kiểm tra 4 email templates cơ bản`);

    console.log('� Tạo/đảm bảo permissions...');
    await prisma.permissions.createMany({ data: permissionsData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${permissionsData.length} quyền`);

    console.log('🎭 Tạo/đảm bảo roles...');
    await prisma.roles.createMany({ data: rolesData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${rolesData.length} vai trò`);

    console.log('🔗 Tạo/đảm bảo liên kết vai trò-quyền...');
    await prisma.role_permissions.createMany({ data: rolePermissionsData, skipDuplicates: true });
    console.log(`✅ Đã tạo/kiểm tra ${rolePermissionsData.length} liên kết vai trò-quyền`);

    // --- Sync users.role (legacy enum) to user_roles (junction) ---
    console.log('🧭 Đồng bộ users.role -> user_roles...');
    // Sometimes long-running seed scripts may hit transient "prepared statement does not exist"
    // errors from Postgres. Retry the sync block and reconnect Prisma if that happens.
    {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          // Load roles to map by name
          const allRoles = await prisma.roles.findMany({ select: { id: true, name: true } });
          const roleByName = new Map(allRoles.map((r) => [r.name, r.id]));

          // Fetch users with legacy role enum
          const usersWithRole = await prisma.users.findMany({
            select: { user_id: true, role: true },
          });

          // Build `user_roles` inserts for users where mapping missing
          const toInsert: Array<{ user_id: string; role_id: string }> = [];
          for (const u of usersWithRole) {
            const roleName = (u as any).role as string | undefined;
            if (!roleName) continue;
            const roleId = roleByName.get(roleName);
            if (!roleId) continue; // skip if role not defined in roles table
            // check existence
            const exists = await (prisma as any).user_roles.findFirst({
              where: { user_id: u.user_id, role_id: roleId },
              select: { user_id: true },
            });
            if (!exists) toInsert.push({ user_id: u.user_id, role_id: roleId });
          }

          if (toInsert.length > 0) {
            await (prisma as any).user_roles.createMany({ data: toInsert, skipDuplicates: true });
            console.log(`✅ Đồng bộ ${toInsert.length} user_roles từ users.role`);
          } else {
            console.log('ℹ️ Không có user_roles cần đồng bộ');
          }

          break; // success
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if (msg.includes('prepared statement') || err?.code === '26000') {
            attempt++;
            console.log(
              `⚠️ Transient DB error during user_roles sync (attempt ${attempt}/${maxAttempts}): ${msg}. Reconnecting and retrying...`,
            );
            try {
              await prisma.$disconnect();
            } catch {}
            await prisma.$connect();
            if (attempt >= maxAttempts) {
              console.log('❌ Exceeded retries for user_roles sync');
              console.log('Error:', msg);
              break;
            }
            // retry loop continues
            continue;
          }
          console.log('⚠️ Lỗi khi đồng bộ users.role -> user_roles:', err?.message || err);
          break;
        }
      }
    }

    // --- Additional seeds for previously-empty tables ---
    console.log('💳 Seeding subscriptions, payments, transactions...');
    // Build sample subscriptions/payments/transactions linked to existing users and plans
    // Note: invoices table will be phased out - transactions now contain invoice lifecycle
    // Wrap fetches in retry/reconnect to mitigate transient prepared-statement errors
    let existingUsers: Array<{ user_id: string }> = [];
    let existingPlans: Array<{ id: string; code: string }> = [];
    let plansFull: any[] = [];
    {
      let attempt = 0;
      const maxAttempts = 3;
      while (attempt < maxAttempts) {
        try {
          existingUsers = await prisma.users.findMany({ select: { user_id: true }, take: 20 });
          existingPlans = await prisma.plans.findMany({
            select: { id: true, code: true },
            take: 5,
          });
          // fetch full plan rows so we can embed a plan_snapshot JSON in transactions
          plansFull = await prisma.plans.findMany();
          break;
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          if (msg.includes('prepared statement') || err?.code === '26000') {
            attempt++;
            console.log(
              `⚠️ Transient DB error during subscriptions seed fetch (attempt ${attempt}/${maxAttempts}): ${msg}. Reconnecting and retrying...`,
            );
            try {
              await prisma.$disconnect();
            } catch {}
            await prisma.$connect();
            if (attempt >= maxAttempts) {
              console.log('❌ Exceeded retries for subscriptions seed fetch');
              throw err;
            }
            continue;
          }
          throw err;
        }
      }
    }
    const subscriptionData: any[] = [];
    const paymentData: any[] = [];
    const transactionData: any[] = [];
    // const invoiceData: any[] = []; // Commented out - no longer creating invoices
    try {
      for (let i = 0; i < 20; i++) {
        const user = existingUsers[i % existingUsers.length];
        const plan = existingPlans[i % existingPlans.length];
        const subId = randomUUID();
        subscriptionData.push({
          subscription_id: subId,
          user_id: user.user_id,
          plan_code: plan.code,
          status: 'active',
          current_period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          started_at: new Date(),
          current_period_start: new Date(),
        });
        const paymentId = randomUUID();
        paymentData.push({
          payment_id: paymentId,
          user_id: user.user_id,
          amount: BigInt(100000),
          status: 'paid', // Updated payment status to match new lifecycle
          provider: 'manual',
          created_at: new Date(),
          updated_at: new Date(),
        });
        const txId = randomUUID();
        const planFull = plansFull.find((p) => p.code === plan.code) ?? {
          id: plan.id,
          code: plan.code,
        };
        transactionData.push({
          amount_subtotal: BigInt(100000),
          amount_discount: BigInt(0),
          amount_tax: BigInt(0),
          tx_id: txId,
          subscription_id: subId,
          plan_code: plan.code,
          plan_snapshot: planFull as any,
          amount_total: BigInt(100000),
          status: 'paid', // Changed from 'succeeded' to new invoice lifecycle status
          period_start: new Date(),
          period_end: new Date(Date.now() + 30 * 24 * 3600 * 1000),
          provider: 'stripe',
          effective_action: 'new',
          provider_payment_id: paymentId,
          payment_id: paymentId, // Link directly to payment
          paid_at: new Date(), // Set paid timestamp for paid transactions
          due_date: new Date(Date.now() + 7 * 24 * 3600 * 1000), // Due date 7 days from now
        });
        // No longer creating invoices - transactions contain invoice lifecycle now
      }
    } catch (e: any) {
      console.log(
        '⚠️ Lỗi khi xây dựng dữ liệu tài chính (subscriptions/payments/transactions):',
        e?.message || e,
      );
    }

    // Persist the finance-related records once after building the arrays
    try {
      if (subscriptionData.length)
        await prisma.subscriptions.createMany({ data: subscriptionData, skipDuplicates: true });
      if (paymentData.length)
        await prisma.payments.createMany({ data: paymentData, skipDuplicates: true });
      if (transactionData.length)
        await prisma.transactions.createMany({ data: transactionData, skipDuplicates: true });
      // No longer creating invoices - transactions serve as invoices now
      console.log('✅ Tạo subscriptions, payments, transactions');
    } catch (e: any) {
      console.log('⚠️ Lỗi khi seeding finance tables:', e?.message || e);
    }

    console.log('🗂️ Seeding credential_images and snapshot_files...');
    const snapshotRows = await prisma.snapshots.findMany({
      select: { snapshot_id: true },
      take: 20,
    });
    const uploadData = [];
    const snapshotImageData = [];
    if (!snapshotRows?.length || !existingUsers.length) {
      console.log(
        'ℹ️ Skipping credential_images/snapshot_files seeding (missing snapshots or users)',
      );
    } else {
      for (let i = 0; i < 30; i++) {
        const s = snapshotRows[i % snapshotRows.length];
        uploadData.push({
          upload_id: randomUUID(),
          user_id: existingUsers[i % existingUsers.length].user_id,
          filename: `upload_${i}.jpg`,
          mime: 'image/jpeg',
          size: 1024,
          url: `https://example.com/upload/${i}.jpg`,
          upload_type: 'other',
          created_at: new Date(),
        });
        snapshotImageData.push({
          image_id: randomUUID(),
          snapshot_id: s.snapshot_id,
          image_path: `snap/${i}.jpg`,
          cloud_url: `https://example.com/snap/${i}.jpg`,
          created_at: new Date(),
        });
      }
    }
    try {
      await prisma.credential_images.createMany({ data: uploadData as any, skipDuplicates: true });
      await prisma.snapshot_files.createMany({
        data: snapshotImageData as any,
        skipDuplicates: true,
      });
      console.log('✅ Tạo credential_images và snapshot_files');
    } catch (e: any) {
      console.log('⚠️ Lỗi khi seeding credential_images/snapshot_files:', e?.message || e);
    }

    console.log('📋 Seeding emergency_contacts, caregiver_invitations, access_grants...');
    const ecData = [];
    const caregiverData = [];
    const sharedPermData = [];
    for (let i = 0; i < 20; i++) {
      const user = existingUsers[i % existingUsers.length];
      ecData.push({
        id: randomUUID(),
        user_id: user.user_id,
        name: `Contact ${i}`,
        relation: 'family',
        phone: `84000000${100 + i}`,
        alert_level: 1,
        created_at: new Date(),
        updated_at: new Date(),
      });
      caregiverData.push({
        assignment_id: randomUUID(),
        caregiver_id: existingUsers[(i + 1) % existingUsers.length].user_id,
        customer_id: user.user_id,
        assigned_at: new Date(),
        is_active: true,
        assigned_by: existingUsers[i % existingUsers.length].user_id,
        assignment_notes: `Seeded assignment note ${i}`,
      });
      sharedPermData.push({
        id: randomUUID(),
        customer_id: user.user_id,
        caregiver_id: existingUsers[(i + 1) % existingUsers.length].user_id,
        // New JSON fields added in schema.prisma: permission_requests and permission_scopes
        // Provide explicit example defaults so seed is complete & self-describing.
        permission_requests: [], // array of pending requests (empty by default)
        permission_scopes: {
          // sample structure: scope keys map to granted permissions and metadata
          // include profile:update so seeded caregivers have update access by default
          'profile:update': true,
          view_snapshots: true,
          view_medical_history: false,
          created_at: new Date().toISOString(),
        },
        created_at: new Date(),
      });
    }
    try {
      await prisma.emergency_contacts.createMany({ data: ecData, skipDuplicates: true });
      await prisma.caregiver_invitations.createMany({ data: caregiverData, skipDuplicates: true });
      await prisma.access_grants.createMany({ data: sharedPermData, skipDuplicates: true });
      console.log('✅ Tạo emergency_contacts, caregiver_invitations, access_grants');
    } catch (e: any) {
      console.log('⚠️ Lỗi khi seeding contact/shared data:', e?.message || e);
    }

    console.log('🛠️ Seeding activity_logs, support_tickets (system_config: critical keys only)');
    // Only seed a small set of activity/search rows. System-level config rows are limited
    // to the four critical image-related keys (see the upsert block below).
    const actData: any[] = [];
    const searchData: any[] = [];
    const ticketData: any[] = [];

    for (let i = 0; i < 5; i++) {
      actData.push({
        id: randomUUID(),
        actor_id: existingUsers[i % existingUsers.length].user_id,
        action: 'login',
        resource_type: 'user',
        message: 'Người dùng đăng nhập',
        severity: 'info',
        timestamp: new Date(),
      });
      searchData.push({
        id: randomUUID(),
        user_id: existingUsers[i % existingUsers.length].user_id,
        searched_at: new Date(),
        query: `search ${i}`,
      });
    }
    try {
      // We intentionally do NOT bulk-create generic system_config rows here.
      // Only the canonical image-related keys will be created/ensured below via upsert.
      await prisma.activity_logs.createMany({ data: actData as any, skipDuplicates: true });
      try {
        await prisma.support_tickets.createMany({ data: ticketData as any, skipDuplicates: true });
      } catch {}
      // TODO: Implement search_history table in schema
      // try {
      //   await prisma.search_history.createMany({ data: searchData as any, skipDuplicates: true });
      // } catch {}
      console.log('✅ Tạo activity_logs, tickets (system_config limited to critical keys)');
    } catch (e: any) {
      console.log('⚠️ Lỗi khi seeding misc tables:', e?.message || e);
    }

    // Ensure critical image-related system_config keys exist (use upsert to guarantee presence)
    try {
      const imageOwner =
        existingUsers && existingUsers.length ? existingUsers[0].user_id : randomUUID();
      const criticalKeys = [
        { key: 'enable_image_saving', value: 'true', dtype: 'boolean' },
        { key: 'capture_enabled', value: 'true', dtype: 'boolean' },
        { key: 'image_quality', value: '1080p', dtype: 'string' },
        { key: 'retention_alert_days', value: '90', dtype: 'int' },
      ];
      // Reconnect to reset prepared statements which can become invalid in long-running seed runs
      try {
        await prisma.$disconnect();
      } catch {}
      try {
        await prisma.$connect();
      } catch {}

      for (const k of criticalKeys) {
        await runWithReconnectSilent(() =>
          prisma.system_config.upsert({
            where: { setting_key: k.key },
            update: {
              setting_value: k.value,
              data_type: k.dtype as any,
              category: 'image',
              updated_by: imageOwner,
            },
            create: {
              setting_id: randomUUID(),
              setting_key: k.key,
              setting_value: k.value,
              data_type: k.dtype as any,
              category: 'image',
              updated_by: imageOwner,
            },
          }),
        );
        // Pace the loop slightly to avoid overwhelming the DB with many back-to-back prepared statements
        await sleep(30);
      }
      console.log('✅ Đảm bảo các system_config image keys tồn tại');
    } catch (err: any) {
      console.log('⚠️ Không thể upsert các system_config image keys:', err?.message || err);
    }

    // Ensure basic notification-related system_config keys exist so AlertSettings API
    // has defaults to return. These are lightweight defaults and can be adjusted later
    // via admin UI or migrations. Category must be 'notification' to be picked up by
    // AlertSettingsService.list()
    try {
      const notifOwner =
        existingUsers && existingUsers.length ? existingUsers[0].user_id : randomUUID();
      const notifKeys = [
        { key: 'alert_push_enabled', value: 'true', dtype: 'boolean' },
        { key: 'alert_sms_enabled', value: 'false', dtype: 'boolean' },
        { key: 'alert_email_enabled', value: 'false', dtype: 'boolean' },
      ];
      // Reconnect before running many upserts
      try {
        await prisma.$disconnect();
      } catch {}
      try {
        await prisma.$connect();
      } catch {}

      for (const k of notifKeys) {
        await runWithReconnectSilent(() =>
          prisma.system_config.upsert({
            where: { setting_key: k.key },
            update: {
              setting_value: k.value,
              data_type: k.dtype as any,
              category: 'notification',
              updated_by: notifOwner,
            },
            create: {
              setting_id: randomUUID(),
              setting_key: k.key,
              setting_value: k.value,
              data_type: k.dtype as any,
              category: 'notification',
              updated_by: notifOwner,
            },
          }),
        );
        await sleep(30);
      }
      console.log('✅ Đảm bảo các system_config notification keys tồn tại');
    } catch (err: any) {
      console.log('⚠️ Không thể upsert các system_config notification keys:', err?.message || err);
    }

    // --------------------- Bulk upsert additional system_config entries ---------------------
    // These rows come from admin export and ensure consistent defaults across environments.
    try {
      const owner = existingUsers && existingUsers.length ? existingUsers[0].user_id : randomUUID();
      const bulkSystemConfigs: Array<Partial<any>> = [
        {
          setting_id: '01f38a05-3f69-440d-87be-603512d47913',
          setting_key: 'subscription.expiry_notice_hour_utc',
          setting_value: '9:17',
          description: 'Giờ VN để scheduler gửi email',
          data_type: 'string',
          category: 'subscription',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '12998d35-0d42-4352-bacb-14bba7a1b07c',
          setting_key: 'suggestions.default_skip_duration',
          setting_value: '30d',
          description: null,
          data_type: 'string',
          category: 'general',
          is_encrypted: false,
          updated_by: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
        },
        {
          setting_id: '150b5457-ff3f-41c2-a3bd-f2ea1ef1ca27',
          setting_key: 'image.alert_retention_days',
          setting_value: '90',
          description: 'Thời gian lưu ảnh liên quan đến cảnh báo',
          data_type: 'int',
          category: 'image',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '39394937-7abb-4747-bfe3-60cb3ac4d524',
          setting_key: 'notification.email_enabled',
          setting_value: 'true',
          description: 'Thông báo qua Email',
          data_type: 'boolean',
          category: 'notification',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '3fe2560b-b04c-4e0f-8554-f2a97416ec7a',
          setting_key: 'abnormal_unconfirmed_streak',
          setting_value: '3',
          description: null,
          data_type: 'int',
          category: 'fall_detection',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '44404e48-2900-4e62-b955-dcf5933e5527',
          setting_key: 'image.normal_retention_days',
          setting_value: '30',
          description: 'Thời gian lưu ảnh bình thường (ngày)',
          data_type: 'int',
          category: 'image',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '4b834869-26c1-42cf-99cc-13ec75273c24',
          setting_key: 'activity_log.abnormal_retention_days',
          setting_value: '90',
          description: 'Thời gian lưu nhật ký bất thường (ngày)',
          data_type: 'int',
          category: 'activity_log',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '586fc54e-f4cc-4c90-8f44-04b9ee0a0a49',
          setting_key: 'image.selected_image_quality',
          setting_value: 'Medium (1080p)',
          description: 'Chất lượng hình ảnh',
          data_type: 'string',
          category: 'image',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '5bf5d803-c364-4f77-9181-3df915b3d07b',
          setting_key: 'notification.sms_enabled',
          setting_value: 'true',
          description: 'Thông báo qua SMS',
          data_type: 'boolean',
          category: 'notification',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '7e8a5ecf-ac37-4952-a2f5-6128cc7523bf',
          setting_key: 'notification.push_enabled',
          setting_value: 'true',
          description: 'Thông báo đẩy',
          data_type: 'boolean',
          category: 'notification',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: '896ccf77-d640-4a72-9d12-b744a6dbb578',
          setting_key: 'suggestions.ttl_days',
          setting_value: '10',
          description: null,
          data_type: 'string',
          category: 'general',
          is_encrypted: false,
          updated_by: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
        },
        {
          setting_id: '9604cfe5-2a5b-4b8c-8e4d-381818f947cf',
          setting_key: 'suggestions.duration_map',
          setting_value:
            '{"15m":900000,"1h":3600000,"8h":28800000,"24h":86400000,"2d":172800000,"7d":604800000,"30d":2592000000}',
          description: null,
          data_type: 'string',
          category: 'general',
          is_encrypted: false,
          updated_by: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
        },
        {
          setting_id: '9a56778a-13cd-407c-9383-d0817a538058',
          setting_key: 'fall_detection_enabled',
          setting_value: 'true',
          description: null,
          data_type: 'boolean',
          category: 'fall_detection',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'a7e748d3-1778-4214-85a1-5fa62656c6e0',
          setting_key: 'suggestions.reminder_interval_hours',
          setting_value: '2',
          description: null,
          data_type: 'string',
          category: 'general',
          is_encrypted: false,
          updated_by: '42d344e5-b5a7-4e4e-bee6-44f43e75f977',
        },
        {
          setting_id: 'ad5652b7-83bc-4f0a-97c6-ac6abaa3b49a',
          setting_key: 'activity_log.normal_retention_days',
          setting_value: '30',
          description: 'Thời gian lưu nhật ký bình thường (ngày)',
          data_type: 'int',
          category: 'activity_log',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'ba3304ad-9c5e-4191-ae6c-ea9bf2c2965a',
          setting_key: 'only_trigger_if_unconfirmed',
          setting_value: 'true',
          description: null,
          data_type: 'boolean',
          category: 'fall_detection',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'bb8a6b74-e68f-4586-8dfd-53ffdbc51266',
          setting_key: 'abnormal_streak_window_minutes',
          setting_value: '30',
          description: null,
          data_type: 'int',
          category: 'fall_detection',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'c13489cd-622b-484c-845f-9d57bc2b67bb',
          setting_key: 'activity_log.enabled',
          setting_value: 'true',
          description: 'Bật/tắt lưu nhật ký hoạt động',
          data_type: 'boolean',
          category: 'activity_log',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'c3022c5c-44fd-4d45-a23f-4006c59eeb8c',
          setting_key: 'notification.enable_call_notification',
          setting_value: 'true',
          description: 'Thông báo qua cuộc gọi',
          data_type: 'boolean',
          category: 'notification',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'e24915a7-afe8-459b-be5a-0af53453c45c',
          setting_key: 'subscription.send_on_expiry_day',
          setting_value: 'true',
          description: 'Có gửi email vào đúng ngày gói hết hạn không',
          data_type: 'boolean',
          category: 'subscription',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
        {
          setting_id: 'ebdee0c0-deab-4dd4-a84b-504f12e9ed0d',
          setting_key: 'subscription.expiry_notice_days_before',
          setting_value: '[7,3,1]',
          description: 'Các mốc ngày nhắc trước khi hết hạn (ngày)',
          data_type: 'json',
          category: 'subscription',
          is_encrypted: false,
          updated_by: '0a69c351-f39c-4b1f-90bb-76e7952400c2',
        },
      ];

      // Reconnect before bulk upserts to avoid stale prepared statement errors
      try {
        await prisma.$disconnect();
      } catch {}
      try {
        await prisma.$connect();
      } catch {}

      // Batch the bulk system configs in small groups to reduce the number of separate
      // prepared statements issued to Postgres in a short time window.
      const BATCH_SIZE = 8;
      for (let i = 0; i < bulkSystemConfigs.length; i += BATCH_SIZE) {
        const batch = bulkSystemConfigs.slice(i, i + BATCH_SIZE);
        // Try to perform the whole batch with a single raw INSERT ... ON CONFLICT statement
        // to dramatically reduce the number of prepared statements issued to Postgres.
        try {
          const rowsSql = batch
            .map(
              (s) =>
                `(${sqlQuote(s.setting_id ?? randomUUID())}, ${sqlQuote(
                  s.setting_key,
                )}, ${sqlQuote(String(s.setting_value ?? ''))}, ${sqlQuote(
                  s.description ?? null,
                )}, ${sqlQuote((s.data_type as any) ?? 'string')}, ${sqlQuote(
                  s.category ?? 'general',
                )}, ${sqlQuote(!!s.is_encrypted)}, now(), ${sqlQuote(s.updated_by ?? owner)})`,
            )
            .join(',');

          const sql = `INSERT INTO system_config (setting_id, setting_key, setting_value, description, data_type, category, is_encrypted, updated_at, updated_by) VALUES ${rowsSql} ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, description = EXCLUDED.description, data_type = EXCLUDED.data_type, category = EXCLUDED.category, is_encrypted = EXCLUDED.is_encrypted, updated_at = now(), updated_by = EXCLUDED.updated_by;`;

          await runWithReconnectSilent(() => prisma.$executeRawUnsafe(sql));
        } catch (err: any) {
          // If raw SQL fails for any reason, fall back to per-item upserts with pacing
          console.log(
            '⚠️ Bulk insert-via-raw-sql failed for system_config batch; falling back to per-item upserts:',
            err?.message || err,
          );
          for (const s of batch) {
            await runWithReconnectSilent(() =>
              prisma.system_config.upsert({
                where: { setting_key: s.setting_key },
                update: {
                  setting_value: String(s.setting_value ?? ''),
                  description: s.description ?? null,
                  data_type: (s.data_type as any) ?? 'string',
                  category: s.category ?? 'general',
                  is_encrypted: !!s.is_encrypted,
                  updated_by: s.updated_by ?? owner,
                },
                create: {
                  setting_id: s.setting_id ?? randomUUID(),
                  setting_key: s.setting_key!,
                  setting_value: String(s.setting_value ?? ''),
                  description: s.description ?? null,
                  data_type: (s.data_type as any) ?? 'string',
                  category: s.category ?? 'general',
                  is_encrypted: !!s.is_encrypted,
                  updated_by: s.updated_by ?? owner,
                },
              }),
            );
            await sleep(20);
          }
        }
        // Slight pause between batches
        await sleep(60);
      }
      console.log('✅ Upserted bulk system_config defaults');
    } catch (err: any) {
      console.log('⚠️ Lỗi khi upsert bulk system_config:', err?.message || err);
    }

    // --- Seed previously-empty tables: app_clients, app_client_roles, camera_issues, subscription_histories, user_preferences ---
    console.log(
      '🔧 Tạo/đảm bảo app_clients, app_client_roles, camera_issues, subscription_histories, user_preferences...',
    );
    try {
      // Wrap these reads in a retry loop to mitigate transient prepared-statement errors
      let existingCameras: Array<{ camera_id: string; user_id: string }> = [];
      let existingSubscriptions: Array<{ subscription_id: string }> = [];
      let existingUsersSmall: Array<{ user_id: string }> = [];
      {
        let attempt = 0;
        const maxAttempts = 3;
        while (attempt < maxAttempts) {
          try {
            existingCameras = await prisma.cameras.findMany({
              select: { camera_id: true, user_id: true },
              take: 50,
            });
            existingSubscriptions = await prisma.subscriptions.findMany({
              select: { subscription_id: true },
              take: 50,
            });
            existingUsersSmall = await prisma.users.findMany({
              select: { user_id: true },
              take: 20,
            });
            break;
          } catch (err: any) {
            const msg = String(err?.message || err || '');
            if (msg.includes('prepared statement') || err?.code === '26000') {
              attempt++;
              console.log(
                `⚠️ Transient DB error while fetching helper data (attempt ${attempt}/${maxAttempts}): ${msg}. Reconnecting and retrying...`,
              );
              try {
                await prisma.$disconnect();
              } catch {}
              await prisma.$connect();
              if (attempt >= maxAttempts) {
                console.log(
                  '❌ Exceeded retries for fetching helper data; proceeding with what we have',
                );
                break;
              }
              continue;
            }
            throw err;
          }
        }
      }

      const appClientsData: any[] = [
        { app_id: randomUUID(), code: 'mobile_app_v1', name: 'Ứng dụng di động Healthcare v1' },
        { app_id: randomUUID(), code: 'web_portal', name: 'Cổng web Healthcare' },
      ];

      const appClientRolesData: any[] = [];
      for (const ac of appClientsData) {
        appClientRolesData.push({ app_id: ac.app_id, role: 'admin' });
        appClientRolesData.push({ app_id: ac.app_id, role: 'caregiver' });
      }

      const cameraIssuesData: any[] = [];
      for (let i = 0; i < Math.min(20, existingCameras.length); i++) {
        const cam = existingCameras[i % existingCameras.length];
        const reporter = existingUsersSmall[i % existingUsersSmall.length];
        cameraIssuesData.push({
          issue_id: randomUUID(),
          camera_id: cam.camera_id,
          user_id: cam.user_id,
          issue_type: 'other',
          severity: 'medium',
          status: 'open',
          description: `Vấn đề camera sinh tự động ${i}`,
          phone: null,
          notes: 'Vấn đề camera được tạo tự động để kiểm thử',
          attachments: Prisma.DbNull,
          consent: true,
          source: 'internal',
          reported_by: reporter.user_id,
          reported_at: new Date(),
        });
      }

      const subscriptionEventsData: any[] = [];
      for (let i = 0; i < Math.min(20, existingSubscriptions.length); i++) {
        const s = existingSubscriptions[i % existingSubscriptions.length];
        subscriptionEventsData.push({
          subscription_id: s.subscription_id,
          event_type: 'created',
          event_data: { seeded: true, index: i },
          created_at: new Date(),
        });
      }

      const userSettingsData: any[] = [];
      for (let i = 0; i < Math.min(30, existingUsersSmall.length); i++) {
        const u = existingUsersSmall[i % existingUsersSmall.length];
        userSettingsData.push({
          id: randomUUID(),
          user_id: u.user_id,
          category: 'preferences',
          setting_key: `pref_seed_${i}`,
          setting_value: JSON.stringify({ value: i % 2 === 0, updated_by: u.user_id }),
          is_enabled: true,
          is_overridden: false,
        });
      }

      // Add sensible per-user image settings for a few existing users so ImageSettings API has sample data
      const imagePrefsData: any[] = [];
      for (let i = 0; i < Math.min(10, existingUsersSmall.length); i++) {
        const u = existingUsersSmall[i % existingUsersSmall.length];
        imagePrefsData.push({
          id: randomUUID(),
          user_id: u.user_id,
          category: 'image_settings',
          setting_key: 'capture_enabled',
          setting_value: JSON.stringify({
            value: null,
            is_enabled: true,
            updated_by: u.user_id,
          }),
          is_enabled: true,
          is_overridden: false,
        });
        imagePrefsData.push({
          id: randomUUID(),
          user_id: u.user_id,
          category: 'image_settings',
          setting_key: 'image_quality',
          setting_value: JSON.stringify({
            value: '1080p',
            is_enabled: true,
            updated_by: u.user_id,
          }),
          is_enabled: true,
          is_overridden: false,
        });
      }

      // subscription_histories uses autoincrement id; createMany accepts objects without id
      await prisma.subscription_histories.createMany({
        data: subscriptionEventsData as any,
        skipDuplicates: true,
      });
      await prisma.user_preferences.createMany({
        data: userSettingsData as any,
        skipDuplicates: true,
      });
      // Insert or upsert image-specific user preferences so existing prefs are updated
      if (imagePrefsData.length) {
        for (const pref of imagePrefsData) {
          try {
            await runWithReconnectSilent(() =>
              prisma.user_preferences.upsert({
                where: {
                  user_id_category_setting_key: {
                    user_id: pref.user_id,
                    category: pref.category,
                    setting_key: pref.setting_key,
                  },
                },
                update: {
                  setting_value: pref.setting_value,
                  is_enabled: pref.is_enabled,
                  is_overridden: pref.is_overridden,
                  overridden_at: pref.overridden_at ?? null,
                },
                create: pref as any,
              }),
            );
            await sleep(15);
          } catch (e: any) {
            console.log(
              '⚠️ Failed to upsert user preference after retries:',
              pref.user_id,
              pref.setting_key,
              e?.message || e,
            );
          }
        }
      }

      console.log(
        '✅ Đã tạo/kiểm tra app_clients, app_client_roles, camera_issues, subscription_histories, user_preferences',
      );
    } catch (err: any) {
      console.log('⚠️ Lỗi khi seeding additional empty tables:', err?.message || err);
    }

    console.log('✅ Hoàn tất quá trình seed!');
    console.log('📊 Tóm tắt:');
    console.log(`   - ${plansData.length} gói dịch vụ`);
    console.log(`   - ${usersData.length} người dùng`);
    console.log(`   - ${camerasData.length} camera`);
    console.log(`   - ${fcmTokensData.length} FCM tokens`);
    console.log(`   - ${snapshotsData.length} ảnh chụp`);
    console.log(`   - ${eventDetectionsData.length} events`);
    console.log(`   - ${notificationsData.length} thông báo`);
    console.log(`   - ${patientHabitsData.length} patient_habits`);
    console.log(`   - ${patientMedicalRecordsData.length} patient_medical_histories`);
    console.log(`   - ${permissionsData.length} quyền`);
    console.log(`   - ${rolesData.length} vai trò`);
    console.log(`   - ${rolePermissionsData.length} liên kết vai trò-quyền`);
  } catch (error) {
    console.error('❌ Lỗi khi seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
