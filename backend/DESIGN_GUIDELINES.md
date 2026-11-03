# Scan My Social   Editorial Intelligence Lab Design System

## Brand Identity

**"Tactical Creative OS"**   Bloomberg Terminal precision meets modern creator tooling.
Sharp, calm, fast, and deeply state-aware.

---

## 1. Color System

| Token | Hex | Usage |
|-------|-----|-------|
| Base Ink | `#141022` | Text, sidebar bg, high-contrast elements |
| Surface | `#FFFFFF` | Cards, modals, inputs |
| Mist | `#F7F4FF` | Page backgrounds |
| Editorial Violet (Primary) | `#7C3AED` | Primary actions, nav active, focus rings |
| Electric Rose (Accent) | `#F43F5E` | Secondary actions, highlights, badges |
| Success | `#10B981` | Validations, completed states |
| Warning | `#F59E0B` | Alerts, pending, non-critical |
| Danger | `#EF4444` | Destructive actions, errors |
| Muted Text | `#6F6785` | Secondary text, timestamps |

### Usage Rules
- Use Tailwind semantic classes: `text-primary-600`, `bg-accent-50`, `border-danger-200`
- Never use raw hex in components   always reference tokens

---

## 2. Typography

| Role | Family | Weights | Usage |
|------|--------|---------|-------|
| Headings | **Sora** | 700, 800 | Page titles, section headers, product authority |
| UI / Body | **Manrope** | 400, 500, 600, 700 | Body text, labels, descriptions |
| Data | **JetBrains Mono** | 400, 500, 600 | Scores, metrics, timestamps, usage stats |

### Components

```jsx
import { Heading, Text, DataText } from '@/Components/Typography';

<Heading level={1}>Page Title</Heading>      // Sora 800
<Heading level={3}>Section Header</Heading>  // Sora 700
<Text>Body content</Text>                     // Manrope 500
<DataText>9.4/10</DataText>                   // JetBrains Mono
```

---

## 3. Shape + Surface

### Border Radius (strict system   no random radii)
- **14px** (`rounded-brand-sm`): Buttons, badges, inputs
- **18px** (`rounded-brand`): Cards, panels
- **24px** (`rounded-brand-lg`): Modals, hero blocks

### Elevation
| Level | Class | Usage |
|-------|-------|-------|
| Base | `surface-base` | Static cards, info blocks |
| Interactive | `surface-interactive` | Hoverable cards, clickable surfaces |
| Elevated | `surface-elevated` | Popovers, dropdowns |
| Modal |   | Full modals, overlays |

---

## 4. Buttons

```jsx
import Button from '@/Components/Button';

<Button>Save Changes</Button>                     // Editorial Violet primary
<Button variant="accent">Analyze</Button>        // Electric Rose
<Button variant="secondary">Cancel</Button>      // White + border
<Button variant="danger">Delete</Button>         // Red
<Button variant="ghost">More</Button>            // Transparent
<Button icon={Plus}>Add New</Button>              // With icon
<Button isLoading>Processing...</Button>          // Loading state
```

---

## 5. Motion

| Type | Duration | Easing |
|------|----------|--------|
| Micro interactions | 120–180ms | `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Panel transitions | 220–300ms | `cubic-bezier(0.32, 0.72, 0, 1)` |

### Rules
- Motion must be purposeful, not decorative
- No bouncy/toy-like motion in core workflows
- Buttons: subtle magnetic hover (`translateY(-1px)`)
- Modals: spring-soft entry (`scale(0.95)` → `scale(1)`)
- Skeleton states for every async surface   no blank flashes

---

## 6. Accessibility

All features must meet **WCAG AA** standards:

1. **Keyboard Navigation**: All interactive elements reachable via Tab
2. **Focus States**: Violet focus ring (never remove without replacement)
3. **Labels**: All form inputs must have associated labels
4. **Contrast**: Text must have 4.5:1 ratio against background
5. **ARIA**: Use `aria-label` for icon-only buttons
6. **No browser primitives**: Use `ConfirmDialog` instead of `alert()`/`confirm()`

---

## 7. Spacing

| Token | Value |
|-------|-------|
| XS | 0.25rem (4px) |
| SM | 0.5rem (8px) |
| MD | 1rem (16px)   Default padding |
| LG | 1.5rem (24px)   Card padding |
| XL | 2rem (32px)   Section separation |
