/**
 * Register Discord slash commands.
 * Run: npm run register-commands -w apps/api
 *
 * Required env vars (in .env or shell):
 *   DISCORD_TOKEN, DISCORD_CLIENT_ID
 *   DISCORD_GUILD_ID  (optional — if set, registers to a single guild for faster testing)
 */

import { config } from 'dotenv';
// Load .env.local first (takes priority), then fall back to .env
config({ path: '.env.local' });
config({ path: '.env' });

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID || process.env.DISCORD_APPLICATION_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is required');
  process.exit(1);
}
if (!CLIENT_ID) {
  console.error('❌ DISCORD_CLIENT_ID (or DISCORD_APPLICATION_ID) is required');
  process.exit(1);
}

/**
 * Commands — all use modals so they have no options.
 * Edit / delete are now done via the /我的文章 button UI.
 */
const commands = [
  {
    name: '貼文',
    description: '新增一則動態（開啟輸入視窗）',
  },
  {
    name: '文章',
    description: '新增一篇長文章（開啟輸入視窗）',
  },
  {
    name: '旅記',
    description: '新增旅遊記錄（開啟輸入視窗）',
  },
  {
    name: '書摘',
    description: '新增讀書心得（開啟輸入視窗）',
  },
  {
    name: '我的文章',
    description: '查看最近的文章，並可編輯、典藏或刪除',
  },
  {
    name: '附圖',
    description: '為已存在的文章附加圖片',
    options: [
      {
        name: 'slug',
        description: '文章的 slug（網址最後一段）',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'image',
        description: '要上傳的圖片（可重複執行加多張）',
        type: 11, // ATTACHMENT
        required: true,
      },
      {
        name: 'alt',
        description: '圖片說明文字（選填）',
        type: 3, // STRING
        required: false,
      },
    ],
  },
  {
    name: '個人資料',
    description: '編輯個人名稱、簡介和連結',
  },
  {
    name: '設定頭貼',
    description: '上傳個人頭貼圖片',
    options: [
      {
        name: 'image',
        description: '頭貼圖片',
        type: 11, // ATTACHMENT
        required: true,
      },
    ],
  },
  {
    name: '設定橫條',
    description: '上傳個人主頁橫條圖片',
    options: [
      {
        name: 'image',
        description: '橫條圖片（建議寬：長 = 3:1）',
        type: 11, // ATTACHMENT
        required: true,
      },
    ],
  },
];

const endpoint = GUILD_ID
  ? `https://discord.com/api/v10/applications/${CLIENT_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`;

const scope = GUILD_ID ? `Guild ${GUILD_ID}` : 'Global';

async function register() {
  console.log(`Registering ${commands.length} commands (${scope})…`);

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ Failed (${res.status}):`, err);
    process.exit(1);
  }

  const data = (await res.json()) as any[];
  console.log('✅ Registered commands:');
  data.forEach((cmd) => console.log(`  /${cmd.name}  —  ${cmd.description}`));

  if (!GUILD_ID) {
    console.log('\n⚠️  Global commands may take up to 1 hour to propagate.');
    console.log('   Set DISCORD_GUILD_ID for instant updates during development.');
  }
}

register().catch((e) => {
  console.error('❌ Unexpected error:', e);
  process.exit(1);
});
