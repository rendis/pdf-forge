# TipTap Extensions

Módulo de extensiones custom para TipTap v3.

## Estructura

```
tiptap-extensions/
├── index.ts                 # Barrel export principal
├── types.ts                 # Tipos compartidos
├── utils/                   # Helpers compartidos
│   └── prosemirror-helpers.ts
└── page-boundary/           # Extensión de límites de página
    └── page-boundary-keymap.ts
```

## Extensiones Disponibles

### PageBoundaryKeymap

Maneja el comportamiento de teclado en límites entre páginas:

- **Backspace**: Une el contenido con la página anterior cuando el cursor está al inicio de una página

```typescript
import { PageBoundaryKeymap } from '@/features/editor/tiptap-extensions'

const editor = useEditor({
  extensions: [
    // ... otras extensiones
    PageBoundaryKeymap, // Agregar antes de PageExtension
    PageExtension.configure({ ... }),
  ],
})
```

## Utils Disponibles

### findParentPage

Encuentra el nodo página padre de la selección actual.

```typescript
import { findParentPage } from '@/features/editor/tiptap-extensions'

const pageInfo = findParentPage(selection)
if (pageInfo) {
  console.log(pageInfo.node, pageInfo.pos, pageInfo.start)
}
```

### isAtPageStart

Verifica si el cursor está al inicio de una página.

```typescript
import { isAtPageStart } from '@/features/editor/tiptap-extensions'

if (isAtPageStart(selection, pageStart)) {
  // Cursor está al inicio de la página
}
```

## Agregar Nueva Extensión

1. Crear carpeta en `tiptap-extensions/mi-extension/`
2. Crear archivo de extensión `mi-extension.ts`
3. Crear `index.ts` con export
4. Agregar export en `tiptap-extensions/index.ts`

## Convenciones

- Archivos en kebab-case (`page-boundary-keymap.ts`)
- Una extensión por carpeta
- Utils compartidos en `/utils/`
- Tipos en `types.ts` raíz del módulo
