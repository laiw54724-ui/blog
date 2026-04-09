import { describe, it, expect, vi } from 'vitest';
import app from '../index';
import { createMockDb, createMockEnv, createMockExecutionCtx, sampleEntries } from './helpers';

/**
 * Integration tests for Discord interaction endpoint.
 * Signature verification is mocked — we can't generate valid Ed25519 sigs in unit tests.
 */
vi.mock('../discord/verify', () => ({
  verifyDiscordSignature: vi.fn().mockResolvedValue(true),
}));

function post(env: any, payload: any) {
  return app.request(
    '/api/discord/interactions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature-ed25519': 'test_sig',
        'x-signature-timestamp': '1234567890',
      },
      body: JSON.stringify(payload),
    },
    env,
    createMockExecutionCtx() as any
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function command(name: string, options: any[] = []) {
  return {
    type: 2,
    data: { name, options },
    member: { user: { id: '123', username: 'testuser' } },
  };
}

function modalSubmit(customId: string, fields: Record<string, string>) {
  return {
    type: 5,
    data: {
      custom_id: customId,
      components: Object.entries(fields).map(([id, value]) => ({
        type: 1,
        components: [{ type: 4, custom_id: id, value }],
      })),
    },
    member: { user: { id: '123', username: 'testuser' } },
  };
}

function buttonClick(customId: string) {
  return {
    type: 3,
    data: { custom_id: customId },
    member: { user: { id: '123', username: 'testuser' } },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/discord/interactions', () => {
  // ── Signature ────────────────────────────────────────────────────────────

  it('rejects requests without signature headers', async () => {
    const env = createMockEnv(createMockDb());
    const res = await app.request(
      '/api/discord/interactions',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
      env
    );
    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.error).toContain('signature');
  });

  // ── PING ─────────────────────────────────────────────────────────────────

  it('PING → PONG (type 1)', async () => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, { type: 1 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(1);
  });

  // ── Slash commands → open Modal (type 9) ─────────────────────────────────

  it.each([
    ['post', '貼文'],
    ['article', '文章'],
    ['travel', '旅記'],
    ['reading', '書摘'],
  ])('%s command opens a modal', async (key) => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, command(key));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(9); // MODAL
    expect(body.data.custom_id).toBe(`create:${key}`);
    expect(body.data.components).toHaveLength(2); // title + content inputs
  });

  it('unknown command → ephemeral error (still 200)', async () => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, command('unknown_xyz'));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('未知指令');
    expect(body.data.flags).toBe(64); // ephemeral
  });

  // ── /我的文章 ──────────────────────────────────────────────────────────

  it('/我的文章 responds immediately with deferred (type 5)', async () => {
    const db = createMockDb({ allResults: sampleEntries });
    const env = { ...createMockEnv(db), DISCORD_APPLICATION_ID: '123', executionCtx: { waitUntil: vi.fn() } };
    const res = await post(env, { ...command('我的文章'), token: 'interaction_token' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // Deferred ephemeral response
    expect(body.type).toBe(5);
    expect(body.data.flags).toBe(64);
  });

  // ── MODAL_SUBMIT (type 5) ────────────────────────────────────────────────

  it('create modal submit → saves entry', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit('create:post', { content: '今天天氣很好，出去走走了。' })
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.flags).toBe(64); // ephemeral
    expect(body.data.content).toContain('✅');

    const insertSql = db._queries.find((q: any) => q.sql.startsWith('INSERT INTO entries'));
    expect(insertSql).toBeDefined();
  });

  it('create modal with title and content', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit('create:article', { title: '我的旅遊心得', content: '這次去了東京…' })
    );
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('✅');
  });

  it('create modal with empty content → error', async () => {
    const db = createMockDb();
    const env = createMockEnv(db);
    const res = await post(env, modalSubmit('create:post', { content: '   ' }));
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('❌');
  });

  it('edit modal submit → updates entry', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit(`edit_modal:${sampleEntries[0].id}`, {
        title: '更新後的標題',
        content: '更新後的內容',
      })
    );
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('✅');

    const updateSql = db._queries.find((q: any) => q.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
  });

  it('edit modal for nonexistent entry → error', async () => {
    const db = createMockDb({ firstResult: null });
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit('edit_modal:nonexistent_id', { content: '新內容' })
    );
    const body = (await res.json()) as any;
    expect(body.data.content).toContain('❌');
  });

  // ── MESSAGE_COMPONENT / buttons (type 3) ─────────────────────────────────

  it('edit button → opens edit modal', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`edit:${sampleEntries[0].id}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(9); // MODAL
    expect(body.data.custom_id).toBe(`edit_modal:${sampleEntries[0].id}`);
    // Content field should be pre-filled
    const contentRow = body.data.components.find((r: any) =>
      r.components.some((c: any) => c.custom_id === 'content')
    );
    expect(contentRow).toBeDefined();
  });

  it('archive button → shows confirmation', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`archive_confirm:${sampleEntries[0].id}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7); // UPDATE_MESSAGE
    expect(body.data.content).toContain('典藏');
    const confirmBtn = body.data.components[0].components.find(
      (c: any) => c.custom_id === `do_archive:${sampleEntries[0].id}`
    );
    expect(confirmBtn).toBeDefined();
  });

  it('hard-delete button → shows confirmation', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`harddelete_confirm:${sampleEntries[0].id}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('永久刪除');
  });

  it('do_archive → archives entry', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`do_archive:${sampleEntries[0].id}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('典藏');
    const updateSql = db._queries.find((q: any) => q.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
  });

  it('do_harddelete → hard deletes entry', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`do_harddelete:${sampleEntries[0].id}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('永久刪除');
    const deleteSql = db._queries.find((q: any) => q.sql.startsWith('DELETE FROM entries'));
    expect(deleteSql).toBeDefined();
  });

  it('cancel button → dismisses', async () => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, buttonClick('cancel'));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('已取消');
  });

  // ── Edit modal with status field ───────────────────────────────────────────

  it('edit button → modal includes status field pre-filled', async () => {
    const db = createMockDb({ firstResult: sampleEntries[2] }); // draft entry
    const env = createMockEnv(db);
    const res = await post(env, buttonClick(`edit:${sampleEntries[2].id}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(9); // MODAL
    const statusRow = body.data.components.find((r: any) =>
      r.components.some((c: any) => c.custom_id === 'status')
    );
    expect(statusRow).toBeDefined();
    const statusInput = statusRow.components.find((c: any) => c.custom_id === 'status');
    expect(statusInput.value).toBe('draft');
  });

  it('edit modal submit with status published → updates entry and sets visibility public', async () => {
    const db = createMockDb({ firstResult: sampleEntries[2] }); // draft entry
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit(`edit_modal:${sampleEntries[2].id}`, {
        title: '已發佈文章',
        content: '內容',
        status: 'published',
      })
    );
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('✅');
    expect(body.data.content).toContain('published');
    const updateSql = db._queries.find((q: any) => q.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
  });

  it('edit modal submit with invalid status → ignores status field', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const res = await post(
      env,
      modalSubmit(`edit_modal:${sampleEntries[0].id}`, {
        content: '新內容',
        status: 'invalid_status',
      })
    );
    const body = (await res.json()) as any;
    expect(body.type).toBe(4);
    expect(body.data.content).toContain('✅');
  });

  // ── Bulk select + batch operations ────────────────────────────────────────

  function selectMenu(customId: string, values: string[]) {
    return {
      type: 3,
      data: { custom_id: customId, values, component_type: 3 },
      member: { user: { id: '123', username: 'testuser' } },
    };
  }

  it('bulk_select → shows action buttons with encoded IDs', async () => {
    const env = createMockEnv(createMockDb());
    const selectedIds = [sampleEntries[0].id, sampleEntries[2].id];
    const res = await post(env, selectMenu('bulk_select', selectedIds));
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.type).toBe(7); // UPDATE_MESSAGE
    expect(body.data.content).toContain('2');
    // Buttons should encode IDs
    const buttons = body.data.components[0].components;
    const publishBtn = buttons.find((b: any) => b.custom_id?.startsWith('bulk_pub:'));
    expect(publishBtn).toBeDefined();
    expect(publishBtn.custom_id).toContain(sampleEntries[0].id);
    expect(publishBtn.custom_id).toContain(sampleEntries[2].id);
  });

  it('bulk_select with no values → error', async () => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, selectMenu('bulk_select', []));
    const body = (await res.json()) as any;
    expect(body.data.content).toContain('❌');
  });

  it('bulk_pub → publishes all selected entries', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const ids = [sampleEntries[0].id, sampleEntries[2].id];
    const res = await post(env, buttonClick(`bulk_pub:${ids.join('|')}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('✅');
    expect(body.data.content).toContain('2');
    const updateSql = db._queries.find((q: any) => q.sql.startsWith('UPDATE entries SET'));
    expect(updateSql).toBeDefined();
  });

  it('bulk_archive → archives all selected entries', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const ids = [sampleEntries[0].id, sampleEntries[1].id];
    const res = await post(env, buttonClick(`bulk_archive:${ids.join('|')}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('典藏');
    expect(body.data.content).toContain('2');
  });

  it('bulk_del → hard deletes all selected entries', async () => {
    const db = createMockDb({ firstResult: sampleEntries[0] });
    const env = createMockEnv(db);
    const ids = [sampleEntries[1].id];
    const res = await post(env, buttonClick(`bulk_del:${ids.join('|')}`));
    const body = (await res.json()) as any;
    expect(body.type).toBe(7);
    expect(body.data.content).toContain('永久刪除');
    const deleteSql = db._queries.find((q: any) => q.sql.startsWith('DELETE FROM entries'));
    expect(deleteSql).toBeDefined();
  });

  // ── Error cases ───────────────────────────────────────────────────────────

  it('returns 500 when DB is missing', async () => {
    const env = { DISCORD_PUBLIC_KEY: 'test' };
    const res = await post(env, command('post'));
    expect(res.status).toBe(500);
  });

  it('returns 400 for unhandled interaction type', async () => {
    const env = createMockEnv(createMockDb());
    const res = await post(env, { type: 99 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error).toContain('Unhandled');
  });
});
