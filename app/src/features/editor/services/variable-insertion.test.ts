import { describe, expect, it } from 'vitest'
import {
  buildPendingVariableState,
  buildVariableInsertPlan,
  resolveActiveSurface,
  resolveVariableTargetSurface,
  type ActiveSurface,
} from './variable-insertion'
import type { VariableDragData } from '../types/drag'

function createDragData(overrides: Partial<VariableDragData> = {}): VariableDragData {
  return {
    id: 'greeting',
    itemType: 'variable',
    variableId: 'greeting',
    label: 'Greeting',
    injectorType: 'TEXT',
    sourceType: 'EXTERNAL',
    ...overrides,
  }
}

describe('variable-insertion', () => {
  it('falls back to body when header surface is hidden', () => {
    expect(resolveActiveSurface(false, 'header')).toBe('body')
    expect(resolveActiveSurface(true, 'header')).toBe('header')
  })

  it('routes header insertion to body when header editor is unavailable', () => {
    expect(resolveVariableTargetSurface('header', false)).toBe('body')
    expect(resolveVariableTargetSurface('header', true)).toBe('header')
    expect(resolveVariableTargetSurface('body', true)).toBe('body')
  })

  it('builds pending variable state preserving format config and default source type', () => {
    const pending = buildPendingVariableState(
      createDragData({
        injectorType: 'DATE',
        formatConfig: { default: 'DD/MM/YYYY', options: ['DD/MM/YYYY', 'MM/DD/YYYY'] },
        sourceType: undefined,
      }),
      42
    )

    expect(pending).toEqual({
      position: 42,
      variable: expect.objectContaining({
        variableId: 'greeting',
        type: 'DATE',
        sourceType: 'EXTERNAL',
        formatConfig: { default: 'DD/MM/YYYY', options: ['DD/MM/YYYY', 'MM/DD/YYYY'] },
      }),
    })
  })

  it('plans configurable inline injectors on the target surface', () => {
    const plan = buildVariableInsertPlan({
      data: createDragData({
        injectorType: 'DATE',
        formatConfig: { default: 'DD/MM/YYYY', options: ['DD/MM/YYYY', 'MM/DD/YYYY'] },
      }),
      targetSurface: 'header',
      targetSelection: 18,
      bodySelection: 9,
    })

    expect(plan).toEqual({
      command: 'setInjector',
      position: 18,
      requiresFormat: true,
      targetSurface: 'header',
    })
  })

  it('uses explicit drop positions for inline injectors', () => {
    const plan = buildVariableInsertPlan({
      data: createDragData(),
      targetSurface: 'body',
      targetSelection: 18,
      bodySelection: 9,
      position: 33,
    })

    expect(plan).toEqual({
      command: 'setInjector',
      position: 33,
      requiresFormat: false,
      targetSurface: 'body',
    })
  })

  it.each([
    ['TABLE', 'setTableInjector'],
    ['LIST', 'setListInjector'],
  ] satisfies [VariableDragData['injectorType'], string][])(
    'keeps block injector %s on the body surface',
    (injectorType, command) => {
      const plan = buildVariableInsertPlan({
        data: createDragData({ injectorType }),
        targetSurface: 'header' as ActiveSurface,
        targetSelection: 18,
        bodySelection: 9,
      })

      expect(plan).toEqual({
        command,
        position: 9,
        requiresFormat: false,
        targetSurface: 'body',
      })
    }
  )
})
