const PLACEHOLDER_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="none">
  <rect width="400" height="300" rx="24" fill="#F8FAFC"/>
  <rect x="24" y="24" width="352" height="252" rx="18" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="10 8"/>
  <path d="M118 206L172 152L212 192L258 146L322 206" stroke="#64748B" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="148" cy="108" r="22" fill="#94A3B8"/>
  <text x="200" y="248" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600" fill="#475569">
    IMAGE PLACEHOLDER
  </text>
</svg>
`.trim()

export const IMAGE_VARIABLE_PLACEHOLDER_SRC = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
  PLACEHOLDER_SVG
)}`
