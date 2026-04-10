/**
 * JH Sisyphus — Electron Preload Script
 * contextIsolation: true 환경에서 renderer에게 필요한 API만 안전하게 노출
 */

const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');
const fs = require('fs');

// ─── .env 로드 ────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
      line = line.trim();
      if (line && !line.startsWith('#') && line.includes('=')) {
        const [k, ...rest] = line.split('=');
        env[k.trim()] = rest.join('=').trim();
      }
    });
  }
  return env;
}

const env = loadEnv();

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  platform: process.platform,
  serverPort: 8765,
  supabaseUrl: env.SUPABASE_URL || '',
  supabaseAnonKey: env.SUPABASE_ANON_KEY || '',
  projectName: env.PROJECT_NAME || 'JH Sisyphus',
});
