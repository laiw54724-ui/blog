import type { Context } from 'hono';
import { verifyDiscordSignature } from './verify';
import { CHINESE_TO_ENGLISH_COMMAND_MAP, getCommandPreset } from './presets';
import { openCreateModal } from './handlers/create';
import { handleCreateModal, handleEditModal } from './handlers/modal';
import { sendListFollowup } from './handlers/list';
import { handleComponent } from './handlers/component';
import { getEntryBySlug, createAsset } from '@personal-blog/shared/db';
import { generateId } from '@personal-blog/shared';
import { processAttachments } from './attachments';

export async function handleDiscordInteraction(c: Context) {
  // ── Verify signature ─────────────────────────────────────────────────────
  const signature = c.req.header('x-signature-ed25519');
  const timestamp = c.req.header('x-signature-timestamp');
  if (!signature || !timestamp) {
    return c.json({ error: 'Missing signature headers' }, 401);
  }

  const body = await c.req.text();
  const isValid = await verifyDiscordSignature(
    signature,
    timestamp,
    body,
    (c.env as any).DISCORD_PUBLIC_KEY
  );
  if (!isValid) {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const payload = JSON.parse(body);
  const db = (c.env as any)?.DB;
  if (!db) return c.json({ error: 'Database not configured' }, 500);

  // ── 1. PING ───────────────────────────────────────────────────────────────
  if (payload.type === 1) {
    return c.json({ type: 1 });
  }

  // ── 2. APPLICATION_COMMAND ────────────────────────────────────────────────
  if (payload.type === 2) {
    const name: string = payload.data?.name ?? '';
    const commandKey = CHINESE_TO_ENGLISH_COMMAND_MAP[name] || name;

    // /我的文章 — deferred ephemeral, then follow-up via REST
    if (commandKey === 'list') {
      const appId = (c.env as any)?.DISCORD_APPLICATION_ID;
      const discordToken = (c.env as any)?.DISCORD_TOKEN;
      const token: string = payload.token;

      if (appId && discordToken && token) {
        (c.executionCtx as any).waitUntil(
          sendListFollowup(db, appId, token, discordToken)
        );
      }

      // Respond immediately so Discord doesn't timeout
      return c.json({ type: 5, data: { flags: 64 } });
    }

    // /附圖 — attach image(s) to an existing entry by slug
    if (commandKey === 'attach') {
      const slugOpt = payload.data?.options?.find((o: any) => o.name === 'slug');
      const altOpt = payload.data?.options?.find((o: any) => o.name === 'alt');
      const slug = slugOpt?.value?.trim();

      if (!slug) {
        return c.json({ type: 4, data: { content: '❌ 請提供文章 slug', flags: 64 } });
      }

      const entry = await getEntryBySlug(db, slug);
      if (!entry) {
        return c.json({ type: 4, data: { content: `❌ 找不到 slug: ${slug}`, flags: 64 } });
      }

      const entryId = (entry as any).id;
      const resolvedAttachments = payload.data?.resolved?.attachments
        ? Object.values(payload.data.resolved.attachments)
        : [];

      if (resolvedAttachments.length === 0) {
        return c.json({ type: 4, data: { content: '❌ 請附上至少一張圖片', flags: 64 } });
      }

      const bucket = (c.env as any)?.ASSETS_BUCKET;
      if (!bucket) {
        return c.json({ type: 4, data: { content: '❌ R2 bucket 未設定', flags: 64 } });
      }

      try {
        const result = await processAttachments(resolvedAttachments as any[], entryId, bucket, {
          altText: altOpt?.value?.trim(),
          coverMode: 'auto',
        });

        for (const asset of result.pendingAssets) {
          await createAsset(db, {
            id: asset.id,
            entry_id: entryId,
            kind: asset.kind,
            storage_key: asset.storage_key,
            mime_type: asset.mime_type,
            width: asset.width,
            height: asset.height,
            alt_text: asset.alt_text,
            sort_order: asset.sort_order,
          });
        }

        // Set first cover asset if none set yet
        if (result.pendingAssets.some((a) => a.kind === 'cover') && !(entry as any).cover_asset_id) {
          const coverId = result.pendingAssets.find((a) => a.kind === 'cover')!.id;
          await db.prepare('UPDATE entries SET cover_asset_id = ? WHERE id = ?').bind(coverId, entryId).run();
        }

        return c.json({
          type: 4,
          data: {
            content: `🖼️ 已為「${(entry as any).title || slug}」附加 ${result.pendingAssets.length} 張圖片`,
            flags: 64,
          },
        });
      } catch (error) {
        console.error('Attach error:', error);
        return c.json({ type: 4, data: { content: '❌ 圖片上傳失敗，請稍後再試', flags: 64 } });
      }
    }

    // /貼文 /文章 /旅記 /書摘 — open create modal
    const preset = getCommandPreset(commandKey);
    if (preset) {
      return c.json(openCreateModal(preset, commandKey));
    }

    return c.json({ type: 4, data: { content: `❌ 未知指令: ${name}`, flags: 64 } });
  }

  // ── 3. MESSAGE_COMPONENT (button clicks and select menus) ────────────────
  if (payload.type === 3) {
    const customId: string = payload.data?.custom_id ?? '';
    const values: string[] | undefined = payload.data?.values;
    const response = await handleComponent(db, customId, values);
    return c.json(response);
  }

  // ── 5. MODAL_SUBMIT ───────────────────────────────────────────────────────
  if (payload.type === 5) {
    const customId: string = payload.data?.custom_id ?? '';
    const components = payload.data?.components ?? [];

    if (customId.startsWith('create:')) {
      const commandKey = customId.slice('create:'.length);
      return c.json(await handleCreateModal(db, commandKey, components));
    }

    if (customId.startsWith('edit_modal:')) {
      const entryId = customId.slice('edit_modal:'.length);
      return c.json(await handleEditModal(db, entryId, components));
    }

    return c.json({ type: 4, data: { content: '❌ 未知的表單提交', flags: 64 } });
  }

  return c.json({ error: 'Unhandled interaction type' }, 400);
}
