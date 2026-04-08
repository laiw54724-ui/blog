import { describe, it, expect } from 'vitest'
import { COMMAND_PRESETS, getCommandPreset, listCommands } from '../discord/presets'

describe('COMMAND_PRESETS', () => {
  it('defines post preset', () => {
    expect(COMMAND_PRESETS.post).toEqual({
      entry_type: 'post',
      category: 'journal',
      status: 'published',
      visibility: 'public',
      description: expect.any(String),
    })
  })

  it('defines article preset as draft/private', () => {
    expect(COMMAND_PRESETS.article.status).toBe('draft')
    expect(COMMAND_PRESETS.article.visibility).toBe('private')
  })

  it('defines travel as post type', () => {
    expect(COMMAND_PRESETS.travel.entry_type).toBe('post')
    expect(COMMAND_PRESETS.travel.category).toBe('travel')
  })

  it('defines reading as article type', () => {
    expect(COMMAND_PRESETS.reading.entry_type).toBe('article')
    expect(COMMAND_PRESETS.reading.category).toBe('reading')
  })
})

describe('getCommandPreset', () => {
  it('returns preset for valid command', () => {
    expect(getCommandPreset('post')).toBe(COMMAND_PRESETS.post)
  })

  it('returns null for unknown command', () => {
    expect(getCommandPreset('unknown')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getCommandPreset('')).toBeNull()
  })
})

describe('listCommands', () => {
  it('returns all commands with names and descriptions', () => {
    const commands = listCommands()
    expect(commands.length).toBe(Object.keys(COMMAND_PRESETS).length)
    commands.forEach((cmd) => {
      expect(cmd).toHaveProperty('name')
      expect(cmd).toHaveProperty('description')
      expect(cmd.name).toBeTruthy()
      expect(cmd.description).toBeTruthy()
    })
  })

  it('includes post and article commands', () => {
    const names = listCommands().map((c) => c.name)
    expect(names).toContain('post')
    expect(names).toContain('article')
    expect(names).toContain('travel')
    expect(names).toContain('reading')
  })
})
