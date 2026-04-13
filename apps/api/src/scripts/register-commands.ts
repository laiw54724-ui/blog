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
 * Commands — five top-level entry points.
 * Create flows use modals; manage flow uses deferred follow-up UI.
 */
const commands = [
  {
    name: '動態',
    description: '貼文入口：快速記錄日常、近況與旅行片段',
    options: [
      {
        type: 1,
        name: '一般',
        description: '新增一般貼文',
      },
      {
        type: 1,
        name: '旅記',
        description: '新增旅行貼文，預設帶 travel setting',
      },
    ],
  },
  {
    name: '文章',
    description: '文章入口：整理長文、書摘與深度內容',
    options: [
      {
        type: 1,
        name: '一般',
        description: '新增一般文章草稿',
      },
      {
        type: 1,
        name: '書摘',
        description: '新增書摘或閱讀心得',
      },
    ],
  },
  {
    name: '補圖',
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
    description: '管理個人名稱、簡介、頭貼和橫條',
    options: [
      {
        type: 1,
        name: '編輯',
        description: '編輯名稱、簡介與連結',
      },
      {
        type: 1,
        name: '頭貼',
        description: '上傳個人頭貼圖片',
        options: [
          {
            name: 'image',
            description: '頭貼圖片',
            type: 11,
            required: true,
          },
        ],
      },
      {
        type: 1,
        name: '橫條',
        description: '上傳個人主頁橫條圖片',
        options: [
          {
            name: 'image',
            description: '橫條圖片（建議寬：長 = 3:1）',
            type: 11,
            required: true,
          },
        ],
      },
    ],
  },
  {
    name: '管理',
    description: '查看最近內容，並可編輯、典藏或刪除',
  },
  {
    name: '讀了',
    description: '新增一筆閱讀清單記錄',
    options: [
      {
        name: 'title',
        description: '作品名',
        type: 3,
        required: true,
      },
      {
        name: 'genre',
        description: '分類',
        type: 3,
        required: true,
        choices: [
          { name: 'BL', value: 'bl' },
          { name: 'BG', value: 'bg' },
          { name: 'GL', value: 'gl' },
          { name: '無CP', value: 'gen' },
        ],
      },
      {
        name: 'status',
        description: '閱讀狀態',
        type: 3,
        required: true,
        choices: [
          { name: '讀完', value: 'completed' },
          { name: '追更中', value: 'ongoing' },
          { name: '棄文', value: 'dropped' },
        ],
      },
      {
        name: 'author',
        description: '作者',
        type: 3,
        required: false,
      },
      {
        name: 'medium',
        description: '媒介',
        type: 3,
        required: false,
        choices: [
          { name: '小說', value: 'novel' },
          { name: '漫畫', value: 'comic' },
          { name: '韓漫', value: 'manhwa' },
          { name: '日漫', value: 'manga' },
          { name: '條漫', value: 'webtoon' },
          { name: '韓劇', value: 'drama' },
        ],
      },
      {
        name: 'score',
        description: '評分（0-10，可用小數）',
        type: 10,
        required: false,
      },
      {
        name: 'read_at',
        description: '閱讀日期（YYYY-MM-DD）',
        type: 3,
        required: false,
      },
      {
        name: 'tags',
        description: '標籤（逗號或空白分隔）',
        type: 3,
        required: false,
      },
      {
        name: 'lock_mode',
        description: '上鎖模式（選填）',
        type: 3,
        required: false,
        choices: [
          { name: '不上鎖', value: 'none' },
          { name: '18+', value: '18plus' },
          { name: '爭議題材', value: 'controversial' },
        ],
      },
    ],
  },
  {
    name: '補心得',
    description: '為已建立的閱讀記錄補短評或詳細心得',
    options: [
      {
        name: 'title',
        description: '作品名（可輸入部分標題）',
        type: 3,
        required: true,
      },
    ],
  },
  {
    name: '改狀態',
    description: '更新閱讀狀態',
    options: [
      {
        name: 'title',
        description: '作品名（可輸入部分標題）',
        type: 3,
        required: true,
      },
      {
        name: 'status',
        description: '新的閱讀狀態',
        type: 3,
        required: true,
        choices: [
          { name: '讀完', value: 'completed' },
          { name: '追更中', value: 'ongoing' },
          { name: '棄文', value: 'dropped' },
        ],
      },
    ],
  },
  {
    name: '書單',
    description: '查看最近閱讀記錄或搜尋作品',
    options: [
      {
        name: 'keyword',
        description: '搜尋書名或作者（選填）',
        type: 3,
        required: false,
      },
      {
        name: 'status',
        description: '篩選閱讀狀態（選填）',
        type: 3,
        required: false,
        choices: [
          { name: '讀完', value: 'completed' },
          { name: '追更中', value: 'ongoing' },
          { name: '棄文', value: 'dropped' },
        ],
      },
      {
        name: 'tag',
        description: '篩選 tag（例如 relationship:older-seme）',
        type: 3,
        required: false,
      },
    ],
  },
  {
    name: 'help',
    description: '查看所有指令與使用方式',
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
