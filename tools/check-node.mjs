import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function parseVersion(raw) {
  const match = raw.trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

const cwd = process.cwd();
const requiredRaw = readFileSync(join(cwd, '.nvmrc'), 'utf8').trim();
const currentRaw = process.version;

const required = parseVersion(requiredRaw);
const current = parseVersion(currentRaw);

if (!required || !current) {
  console.error('❌ 無法解析 Node 版本設定。請檢查 .nvmrc 與目前的 node -v。');
  process.exit(1);
}

if (compareVersions(current, required) < 0) {
  console.error('');
  console.error(`❌ Node 版本過舊：目前是 ${currentRaw}，此專案需要 >= v${requiredRaw}`);
  console.error('');
  console.error('建議修法：');
  console.error('1. fnm use 22.12.0');
  console.error('2. 如果 fnm current 和 node -v 不一致，把這行加到 ~/.zshrc：');
  console.error('   eval "$(fnm env --shell zsh)"');
  console.error('3. 重新開一個 shell，再確認 node -v');
  console.error('');
  process.exit(1);
}
