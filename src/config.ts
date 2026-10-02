// Central app configuration — the single place for environment-specific values.
// Every override is optional; the fallbacks keep the default demo/dev setup working.
// Prefix overrides with VITE_ (except the pre-existing STATEMENT_* vars) so they
// are baked in at build time by Vite.

/** Backend server (Vite dev proxy target on :9002). */
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:9002`;

/** External bank self-service API (biometric device network). */
export const SELF_SERVICE_API_URL =
  import.meta.env.VITE_SELF_SERVICE_API_URL || 'http://10.203.14.169:8082/api/self-service';

/** Biometric SDK host. */
export const SDK_BASE_URL =
  import.meta.env.VITE_SDK_BASE_URL || 'http://localhost:8080';

/** Imaging / hard-biometric transaction host. */
export const IMAGING_URL =
  import.meta.env.VITE_IMAGING_URL || 'http://10.203.14.169/imaging';

/** Fraud-reporting API. */
export const FRAUD_API_URL =
  import.meta.env.VITE_FRAUD_API_URL || 'https://ibanking.sibll.com:9283/ibank/api/v2.0/user';

/** Fraud-reporting API key. */
export const FRAUD_API_KEY =
  import.meta.env.VITE_FRAUD_API_KEY || '20171411891';

/** Fund-transfer proxy credentials. */
export const FUND_TRANSFER_API_SECRET =
  import.meta.env.VITE_FUND_TRANSFER_API_SECRET || 'testPC';
export const FUND_TRANSFER_POST_BY =
  import.meta.env.VITE_FUND_TRANSFER_POST_BY || 'UNIONADMIN';
export const FUND_TRANSFER_CHANNEL =
  import.meta.env.VITE_FUND_TRANSFER_CHANNEL || 'MOB';

/** Statement proxy forwarding IP. */
export const STATEMENT_FORWARDED_FOR =
  import.meta.env.STATEMENT_FORWARDED_FOR || '10.203.18.237';

/** Kiosk device IP reported to the fraud API. */
export const FRAUD_DEVICE_IP =
  import.meta.env.VITE_FRAUD_DEVICE_IP || '10.203.14.169';

/** Staff360 XAuth (cross-authentication) — used for admin login via X100 credentials. */
export const XAUTH_HOST =
  import.meta.env.VITE_XAUTH_HOST || 'http://10.203.14.15:8080';

/** Public XAuth app key (identifier only — the appSecret stays server-side). */
export const XAUTH_APP_KEY =
  import.meta.env.VITE_XAUTH_APP_KEY || '';
