import crypto from 'crypto';

console.log('🧪 Discord 互動本地測試\n');

// Discord interaction test payload - PING (type 1)
const pingPayload = {
  type: 1, // PING
};

// Discord interaction test payload - APPLICATION_COMMAND (type 2)
const commandPayload = {
  type: 2, // APPLICATION_COMMAND
  data: {
    name: '貼文',
    options: [
      {
        name: 'content',
        value: '🚀 本地測試內容 — 從本地伺服器',
        type: 3, // STRING
      },
    ],
  },
  member: {
    user: {
      id: '123456789',
      username: 'testuser',
    },
  },
  channel_id: '790598892080857119',
  guild_id: '790598892080857119',
};

// Discord public key (from Cloudflare secret)
const publicKey = '4ee1e1896de662808c7ba5f778ba17b55db810be3e0904a67d26499003d663a6';

async function testEndpoint(payload, description) {
  console.log(`\n📨 測試: ${description}`);
  console.log('='.repeat(50));

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);

  console.log('時間戳:', timestamp);
  console.log('負載:', body);

  try {
    const response = await fetch('http://127.0.0.1:8787/api/discord/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature-ed25519': 'fake_signature_for_testing', // 測試用簽名
        'x-signature-timestamp': timestamp,
      },
      body: body,
    });

    console.log('✅ HTTP 狀態:', response.status);
    const data = await response.json();
    console.log('📤 回應:', JSON.stringify(data, null, 2));

    return response.status;
  } catch (error) {
    console.log('❌ 錯誤:', error.message);
    return null;
  }
}

// Test 1: PING (不需要簽名驗證就能通過)
await testEndpoint(pingPayload, 'PING 請求');

// Test 2: APPLICATION_COMMAND (會因為簽名失敗)
await testEndpoint(commandPayload, '貼文命令 (簽名將失敗)');

console.log('\n' + '='.repeat(50));
console.log('✅ 本地測試完成');
