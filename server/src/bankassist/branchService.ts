import axios from 'axios';

const SMART_BRANCH_LOV_URL =
  process.env.SMART_BRANCH_LOV_URL ||
  'http://10.203.14.33:8181/core/api/v1.0/info/smart-branch-lov-codes';

const BALANCE_API_KEY = process.env.BALANCE_API_KEY || '20171411891';
const BALANCE_API_SECRET = process.env.BALANCE_API_SECRET || '141116517P';
const BALANCE_FORWARDED_FOR = process.env.BALANCE_FORWARDED_FOR || '192.168.1.230';

export interface BranchInfo {
  actualCode: string;
  subCode: string | null;
  description: string;
}

let cachedBranchList: BranchInfo[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

/**
 * Fetches all branches live from the Core Banking API.
 * Only caches successful, non-empty responses from the Core Banking system.
 */
export async function getBranchList(): Promise<BranchInfo[]> {
  const now = Date.now();
  if (cachedBranchList && cachedBranchList.length > 0 && now - cacheTime < CACHE_TTL_MS) {
    return cachedBranchList;
  }

  try {
    console.log('[BRANCH_SERVICE] Fetching branch LOV codes from Core Banking API...');
    const response = await axios.get(SMART_BRANCH_LOV_URL, {
      headers: {
        'x-api-key': BALANCE_API_KEY,
        'x-api-secret': BALANCE_API_SECRET,
        'X-Forwarded-For': BALANCE_FORWARDED_FOR,
      },
      timeout: 5000,
    });

    if (response.data && Array.isArray(response.data.branchList) && response.data.branchList.length > 0) {
      const list = response.data.branchList as BranchInfo[];
      cachedBranchList = list;
      cacheTime = now;
      console.log(`[BRANCH_SERVICE] Successfully fetched and cached ${list.length} branches from Core Banking API.`);
      return list;
    }
  } catch (e: any) {
    console.error('[BRANCH_SERVICE] Core Banking API fetch error:', e.message);
  }

  // If a temporary error occurs, return existing valid cache if available, but do not overwrite with empty lock
  return cachedBranchList || [];
}

/**
 * Finds branch description by code (e.g. '004' -> 'SINKOR', 'MAIN' -> 'MAIN BRANCH')
 */
export async function getBranchDescription(code: string): Promise<string> {
  if (!code) return 'MAIN BRANCH';
  const branches = await getBranchList();
  const found = branches.find(
    (b) =>
      b.actualCode.toLowerCase() === code.toLowerCase() ||
      b.description.toLowerCase() === code.toLowerCase()
  );

  if (found) {
    return found.description;
  }
  return code.toUpperCase();
}
