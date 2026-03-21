/**
 * Judge0 API Configuration
 * Supports: Local Judge0 CE Docker | RapidAPI Judge0 CE
 * Note: api.judge0.com is deprecated/unavailable - do not use.
 */

const JUDGE0_API_URL = (process.env.JUDGE0_API_URL || 'http://localhost:2358').trim();
const JUDGE0_API_KEY = (process.env.JUDGE0_API_KEY || '').trim();
const JUDGE0_API_HOST = (process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com').trim();

const isLocal = /localhost|127\.0\.0\.1/.test(JUDGE0_API_URL);
const hasValidRapidApiKey = JUDGE0_API_KEY && !JUDGE0_API_KEY.includes('YOUR_');

const USE_RAPIDAPI = !isLocal && hasValidRapidApiKey;

if (isLocal) {
  console.log('Judge0: Using local instance at', JUDGE0_API_URL);
} else if (USE_RAPIDAPI) {
  console.log('Judge0: Using RapidAPI at', JUDGE0_API_URL);
} else {
  console.warn('Judge0: Misconfigured. Set JUDGE0_API_URL to localhost:2358 for Docker, or JUDGE0_API_KEY for RapidAPI.');
}

function getSubmitConfig() {
  const baseUrl = JUDGE0_API_URL;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    params: { base64_encoded: 'true' }
  };

  if (USE_RAPIDAPI) {
    config.headers['X-RapidAPI-Key'] = JUDGE0_API_KEY;
    config.headers['X-RapidAPI-Host'] = JUDGE0_API_HOST;
  }

  return { baseUrl, config };
}

function getResultConfig() {
  return getSubmitConfig();
}

function isConfigured() {
  return isLocal || USE_RAPIDAPI;
}

module.exports = {
  JUDGE0_API_URL,
  JUDGE0_API_KEY,
  JUDGE0_API_HOST,
  isLocal,
  USE_RAPIDAPI,
  getSubmitConfig,
  getResultConfig,
  isConfigured
};
