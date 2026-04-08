import { REST, Routes } from 'discord.js'


const token = process.env.DISCORD_TOKEN
const clientId = process.env.DISCORD_CLIENT_ID
const guildId = process.env.DISCORD_GUILD_ID

if (!token || !clientId) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID')
  process.exit(1)
}

const commands = [
  {
    name: '貼文',
    description: '發佈一則動態貼文到 Stream',
    options: [
      {
        name: 'content',
        description: '貼文內容（若上傳 .md/.txt 檔案，此欄位可省略）',
        type: 3, // STRING
        required: false,
      },
      {
        name: 'category',
        description: '分類',
        type: 3,
        required: false,
        choices: [
          { name: '日記', value: 'journal' },
          { name: '讀書', value: 'reading' },
          { name: '旅行', value: 'travel' },
          { name: '地點', value: 'place' },
        ],
      },
      {
        name: 'file',
        description: '上傳圖片或 .md/.txt 檔案',
        type: 11, // ATTACHMENT
        required: false,
      },
    ],
  },
  {
    name: '文章',
    description: '發佈一篇文章',
    options: [
      {
        name: 'content',
        description: '文章內容（若上傳 .md/.txt 檔案，此欄位可省略）',
        type: 3,
        required: false,
      },
      {
        name: 'category',
        description: '分類',
        type: 3,
        required: false,
        choices: [
          { name: '日記', value: 'journal' },
          { name: '讀書', value: 'reading' },
          { name: '旅行', value: 'travel' },
          { name: '地點', value: 'place' },
        ],
      },
      {
        name: 'file',
        description: '上傳圖片或 .md/.txt 檔案',
        type: 11, // ATTACHMENT
        required: false,
      },
    ],
  },
  {
    name: '旅記',
    description: '快速記錄旅行見聞',
    options: [
      {
        name: 'content',
        description: '旅行內容（若上傳 .md/.txt 檔案，此欄位可省略）',
        type: 3,
        required: false,
      },
      {
        name: 'file',
        description: '上傳圖片或 .md/.txt 檔案',
        type: 11, // ATTACHMENT
        required: false,
      },
    ],
  },
  {
    name: '書摘',
    description: '記錄讀書筆記或書摘',
    options: [
      {
        name: 'content',
        description: '書摘內容（若上傳 .md/.txt 檔案，此欄位可省略）',
        type: 3,
        required: false,
      },
      {
        name: 'file',
        description: '上傳圖片或 .md/.txt 檔案',
        type: 11, // ATTACHMENT
        required: false,
      },
    ],
  },
  {
    name: '編輯',
    description: '編輯已有的文章或貼文',
    options: [
      {
        name: 'slug',
        description: '文章的 slug（網址路徑）',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'title',
        description: '新標題',
        type: 3,
        required: false,
      },
      {
        name: 'content',
        description: '新內容（會完全取代舊內容）',
        type: 3,
        required: false,
      },
      {
        name: 'status',
        description: '狀態',
        type: 3,
        required: false,
        choices: [
          { name: '已發布', value: 'published' },
          { name: '草稿', value: 'draft' },
          { name: '私人', value: 'private' },
          { name: '封存', value: 'archived' },
        ],
      },
      {
        name: 'visibility',
        description: '可見度',
        type: 3,
        required: false,
        choices: [
          { name: '公開', value: 'public' },
          { name: '不列出', value: 'unlisted' },
          { name: '私人', value: 'private' },
        ],
      },
    ],
  },
  {
    name: '刪除',
    description: '封存文章或貼文（不會永久刪除）',
    options: [
      {
        name: 'slug',
        description: '文章的 slug（網址路徑）',
        type: 3, // STRING
        required: true,
      },
    ],
  },
]

const rest = new REST({ version: '10' }).setToken(token)

async function registerCommands() {
  try {
    console.log('Started refreshing application (/) commands.')

    const endpoint = guildId
      ? Routes.applicationGuildCommands(clientId, guildId)
      : Routes.applicationCommands(clientId)

    await rest.put(endpoint, { body: commands })

    console.log('Successfully reloaded application (/) commands.')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

registerCommands()
