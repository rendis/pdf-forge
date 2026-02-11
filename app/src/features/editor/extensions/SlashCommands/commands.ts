import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  SplitSquareVertical,
  Image,
  GitBranch,
  Variable,
  Table2,
  ListTree,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Editor } from '@tiptap/core'

export interface SlashCommand {
  id: string
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
  groupKey: string
  aliases?: string[]
  action: (editor: Editor) => void
}

export const SLASH_COMMANDS: SlashCommand[] = [
  // Basic
  {
    id: 'text',
    titleKey: 'editor.slashCommands.text',
    descriptionKey: 'editor.slashCommands.textDesc',
    icon: Type,
    groupKey: 'editor.slashCommands.groups.basic',
    aliases: ['p', 'paragraph'],
    action: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: 'heading1',
    titleKey: 'editor.slashCommands.heading1',
    descriptionKey: 'editor.slashCommands.heading1Desc',
    icon: Heading1,
    groupKey: 'editor.slashCommands.groups.basic',
    aliases: ['h1', 'title'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    titleKey: 'editor.slashCommands.heading2',
    descriptionKey: 'editor.slashCommands.heading2Desc',
    icon: Heading2,
    groupKey: 'editor.slashCommands.groups.basic',
    aliases: ['h2', 'subtitle'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    titleKey: 'editor.slashCommands.heading3',
    descriptionKey: 'editor.slashCommands.heading3Desc',
    icon: Heading3,
    groupKey: 'editor.slashCommands.groups.basic',
    aliases: ['h3'],
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },

  // Lists
  {
    id: 'bulletList',
    titleKey: 'editor.slashCommands.bulletList',
    descriptionKey: 'editor.slashCommands.bulletListDesc',
    icon: List,
    groupKey: 'editor.slashCommands.groups.lists',
    aliases: ['ul', 'bullet', 'unordered'],
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    titleKey: 'editor.slashCommands.orderedList',
    descriptionKey: 'editor.slashCommands.orderedListDesc',
    icon: ListOrdered,
    groupKey: 'editor.slashCommands.groups.lists',
    aliases: ['ol', 'numbered', 'ordered'],
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },

  // Blocks
  {
    id: 'blockquote',
    titleKey: 'editor.slashCommands.blockquote',
    descriptionKey: 'editor.slashCommands.blockquoteDesc',
    icon: Quote,
    groupKey: 'editor.slashCommands.groups.blocks',
    aliases: ['quote', 'citation'],
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    titleKey: 'editor.slashCommands.codeBlock',
    descriptionKey: 'editor.slashCommands.codeBlockDesc',
    icon: Code,
    groupKey: 'editor.slashCommands.groups.blocks',
    aliases: ['code', 'pre'],
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    titleKey: 'editor.slashCommands.divider',
    descriptionKey: 'editor.slashCommands.dividerDesc',
    icon: Minus,
    groupKey: 'editor.slashCommands.groups.blocks',
    aliases: ['hr', 'separator', 'line'],
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'pageBreak',
    titleKey: 'editor.slashCommands.pageBreak',
    descriptionKey: 'editor.slashCommands.pageBreakDesc',
    icon: SplitSquareVertical,
    groupKey: 'editor.slashCommands.groups.blocks',
    aliases: ['page', 'break', 'salto', 'pagina'],
    action: (editor) => editor.chain().focus().setPageBreak().run(),
  },
  {
    id: 'table',
    titleKey: 'editor.slashCommands.table',
    descriptionKey: 'editor.slashCommands.tableDesc',
    icon: Table2,
    groupKey: 'editor.slashCommands.groups.blocks',
    aliases: ['tabla', 'grid', 'rows', 'columns'],
    action: (editor) => {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
  },
  // Media
  {
    id: 'image',
    titleKey: 'editor.slashCommands.image',
    descriptionKey: 'editor.slashCommands.imageDesc',
    icon: Image,
    groupKey: 'editor.slashCommands.groups.media',
    aliases: ['img', 'picture', 'photo'],
    action: (editor) => {
      // Dispatch custom event to open the image modal
      editor.view.dom.dispatchEvent(
        new CustomEvent('editor:open-image-modal', { bubbles: true })
      )
    },
  },

  // Documents
  {
    id: 'conditional',
    titleKey: 'editor.slashCommands.conditional',
    descriptionKey: 'editor.slashCommands.conditionalDesc',
    icon: GitBranch,
    groupKey: 'editor.slashCommands.groups.documents',
    aliases: ['if', 'condition', 'logic'],
    action: (editor) => {
      editor.chain().focus().setConditional({}).run()
    },
  },
  {
    id: 'variable',
    titleKey: 'editor.slashCommands.variable',
    descriptionKey: 'editor.slashCommands.variableDesc',
    icon: Variable,
    groupKey: 'editor.slashCommands.groups.documents',
    aliases: ['var', 'placeholder', 'field'],
    action: (editor) => {
      // Insert @ to trigger the mentions menu with available variables
      editor.chain().focus().insertContent('@').run()
    },
  },
  {
    id: 'dynamicList',
    titleKey: 'editor.slashCommands.dynamicList',
    descriptionKey: 'editor.slashCommands.dynamicListDesc',
    icon: ListTree,
    groupKey: 'editor.slashCommands.groups.documents',
    aliases: ['list', 'dynamic', 'injectable', 'lista'],
    action: (editor) => {
      editor.view.dom.dispatchEvent(
        new CustomEvent('editor:insert-list-injector', { bubbles: true })
      )
    },
  },
]

export const filterCommands = (query: string, t: (key: string) => string, editor?: Editor): SlashCommand[] => {
  const isInTable = editor?.isActive('table')
  const baseCommands = isInTable
    ? SLASH_COMMANDS.filter(cmd => !['heading1', 'heading2', 'heading3'].includes(cmd.id))
    : SLASH_COMMANDS

  if (!query) return baseCommands

  const lowerQuery = query.toLowerCase()
  return baseCommands.filter((command) => {
    const title = t(command.titleKey).toLowerCase()
    const description = t(command.descriptionKey).toLowerCase()
    const matchesTitle = title.includes(lowerQuery)
    const matchesDescription = description.includes(lowerQuery)
    const matchesAliases = command.aliases?.some((alias) => alias.includes(lowerQuery))
    return matchesTitle || matchesDescription || matchesAliases
  })
}

export const groupCommands = (commands: SlashCommand[], t: (key: string) => string): Record<string, SlashCommand[]> => {
  return commands.reduce(
    (groups, command) => {
      const groupName = t(command.groupKey)
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(command)
      return groups
    },
    {} as Record<string, SlashCommand[]>
  )
}
