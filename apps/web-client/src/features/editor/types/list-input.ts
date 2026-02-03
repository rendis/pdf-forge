export type ListSymbolType = 'bullet' | 'number' | 'dash' | 'roman' | 'letter'

export const LIST_SYMBOL_OPTIONS: { value: ListSymbolType; i18nKey: string; marker: string }[] = [
  { value: 'bullet', i18nKey: 'editor.listInjector.symbols.bullet', marker: '•' },
  { value: 'number', i18nKey: 'editor.listInjector.symbols.number', marker: '1.' },
  { value: 'dash', i18nKey: 'editor.listInjector.symbols.dash', marker: '–' },
  { value: 'roman', i18nKey: 'editor.listInjector.symbols.roman', marker: 'i.' },
  { value: 'letter', i18nKey: 'editor.listInjector.symbols.letter', marker: 'a)' },
]

export interface ListInputItem {
  id: string
  value: string
  children?: ListInputItem[]
}

export interface ListInputValue {
  items: ListInputItem[]
}
