# Screenshots Guide

This folder contains visual assets for the README. Screenshots should be captured from the running application.

## Required Screenshots

### 1. `hero-screenshot.png` (1600x900)

**View**: Full editor interface
**Content**:
- Template with header, table of items, totals
- Variables panel visible (right side)
- PDF preview visible (right or modal)

**Tips**:
- Maximize browser window
- Use realistic demo data (invoice with 3-5 items)
- Ensure all panels are visible

---

### 2. `templates-list.png` (1200x700)

**View**: Templates list page
**Content**:
- 3+ templates with different statuses (DRAFT, PUBLISHED, ARCHIVED)
- Filters visible
- Breadcrumb showing navigation

**Tips**:
- Show variety of status badges (colorful)
- Include search/filter bar

---

### 3. `editor-variables.png` (800x600)

**View**: Variables panel (crop from editor)
**Content**:
- Variables grouped (billing, customer, etc.)
- At least 1 group expanded
- Show different types (string, number, table icons)

**Tips**:
- Crop centered on the right panel
- Show drag handle hints

---

### 4. `preview-pdf.png` (600x800)

**View**: PDF preview
**Content**:
- Complete invoice PDF
- Realistic data visible
- Header with logo placeholder

**Tips**:
- Can be preview modal or export view
- Portrait orientation

---

### 5. `admin-dashboard.png` (1200x700)

**View**: Administration dashboard
**Content**:
- Tabs visible (Tenants, Workspaces, Document Types, etc.)
- List of items in one tab
- Sidebar visible

**Tips**:
- Show the most visual tab (Workspaces or Document Types)
- Include some data rows

---

## Demo Data Setup

Before capturing screenshots:

```bash
# Start the app
make up

# Open browser
open http://localhost:8080
```

Create demo data:
1. **Tenant**: "Acme Corp"
2. **Workspace**: "Invoices"
3. **Templates**:
   - "Invoice Standard" (PUBLISHED)
   - "Invoice Premium" (DRAFT)
   - "Invoice Legacy" (ARCHIVED)
4. **Template content**: Invoice with table of items, totals, customer data

---

## Post-Processing

After capturing:

1. **Optimize**: `pngquant --quality=65-80 *.png`
2. **Add shadow** (optional): 8px blur, 10% opacity
3. **Verify**: Ensure text is readable at 50% zoom

---

## Logo

The `logo.svg` is included. To modify:
- Primary color: `#0066FF`
- Accent color: `#FF6B35`
- Keep aspect ratio 1:1
