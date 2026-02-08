export interface ListStylesAttrs {
  // Header styles
  headerFontFamily?: string
  headerFontSize?: number
  headerFontWeight?: string
  headerTextColor?: string
  // Item styles
  itemFontFamily?: string
  itemFontSize?: number
  itemFontWeight?: string
  itemTextColor?: string
}

export interface ListInjectorAttrs {
  variableId: string
  label: string
  lang?: string
  symbol?: string
  headerStyles?: Partial<ListStylesAttrs>
  itemStyles?: Partial<ListStylesAttrs>
}

export interface ListInjectorOptions {
  variableId?: string
  label?: string
  lang?: string
  symbol?: string
}
