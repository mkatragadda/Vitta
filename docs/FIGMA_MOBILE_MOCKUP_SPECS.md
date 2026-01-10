# Vitta Chat Interface - Mobile Figma Mockup Specifications

## Overview
Mobile-first chat interface for Vitta financial assistant app. Designed for iOS/Android phones with safe area support.

---

## Artboard Size
- **Width**: 375px (iPhone standard) or 390px (iPhone 14/Pro)
- **Height**: 812px (iPhone X/XS/11 Pro) or 844px (iPhone 12/13/14)
- **Safe Area**: Account for notch/home indicator areas

---

## Color Palette

### Primary Colors
- **Blue Gradient Start**: `#2563EB` (blue-600)
- **Blue Gradient End**: `#4F46E5` (indigo-600)
- **Dark Blue Gradient Start**: `#1E40AF` (blue-900)
- **Dark Blue Gradient End**: `#312E81` (indigo-900)

### Background Colors
- **Main Background**: `#EFF6FF` to `#EEF2FF` (gradient: blue-50 to indigo-100)
- **White**: `#FFFFFF`
- **Input Background**: `#FFFFFF`

### Text Colors
- **Primary Text**: `#111827` (gray-900)
- **Secondary Text**: `#374151` (gray-700)
- **Tertiary Text**: `#6B7280` (gray-500)
- **White Text**: `#FFFFFF`
- **Blue Text**: `#1E40AF` (blue-700)
- **Light Blue Text**: `#BFDBFE` (blue-200)

### Accent Colors
- **Success/Green**: `#16A34A` (green-600)
- **Warning/Yellow**: `#EAB308` (yellow-500)
- **Error/Red**: `#DC2626` (red-600)
- **Green Button**: `#10B981` (green-600)

### Border Colors
- **Light Border**: `#E5E7EB` (gray-200)
- **Input Border**: `#D1D5DB` (gray-300)
- **Sidebar Border**: `#1E3A8A` at 50% opacity (blue-700/50)

---

## Typography

### Font Family
- **System Font Stack**: `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif`

### Font Sizes & Weights
- **H1 (Page Title)**: 30px (3xl), Font Weight: 700 (bold), Color: gray-900
- **H2 (Section Title)**: 24px (2xl), Font Weight: 700 (bold)
- **H3 (Card Title)**: 18px (lg), Font Weight: 600 (semibold)
- **Body Large**: 16px (base), Font Weight: 400 (regular)
- **Body**: 14px (sm), Font Weight: 400 (regular)
- **Body Small**: 12px (xs), Font Weight: 400 (regular)
- **Small Label**: 11px (xs), Font Weight: 500 (medium)

### Line Heights
- **Default**: 1.5 (leading-relaxed)
- **Tight**: 1.25
- **Normal**: 1.5

---

## Layout Structure

### Main Container
- **Width**: 100vw (full screen)
- **Height**: 100vh (full screen)
- **Background**: Gradient from `#EFF6FF` to `#EEF2FF`
- **Display**: Flex column
- **Padding**: 0

### Mobile Header (when sidebar closed)
- **Height**: Auto (minimum 64px)
- **Background**: `#FFFFFF`
- **Border Bottom**: 1px solid `#E5E7EB`
- **Padding**: 16px (p-4)
- **Display**: Flex row, items centered
- **Gap**: 12px (gap-3)

---

## Sidebar Navigation (Mobile: Hidden by default, slide-in drawer)

### Sidebar Dimensions
- **Width (Open)**: 256px (w-64)
- **Width (Closed)**: 0px
- **Height**: 100vh (full height)
- **Background**: Linear gradient from `#1E3A8A` to `#312E81`
- **Transition**: 300ms ease
- **Position**: Fixed/Overlay on mobile

### Sidebar Header
- **Height**: Auto (minimum 56px)
- **Padding**: 16px (p-4)
- **Border Bottom**: 1px solid `#1E3A8A` at 50% opacity
- **Logo Icon**: 32px × 32px circle/square, white background, "V" in blue-600, rounded-lg (8px)
- **Close Button** (mobile only): 20px × 20px icon, color: blue-200

### Navigation Items
- **Container Padding**: 16px (p-4)
- **Item Gap**: 8px (space-y-2)
- **Item Height**: Auto (minimum 48px)
- **Item Padding**: 16px horizontal (px-4), 12px vertical (py-3)
- **Border Radius**: 8px (rounded-lg)
- **Icon Size**: 20px × 20px (w-5 h-5)
- **Icon Gap**: 12px (gap-3)

#### Navigation Item States
- **Active**: Background `rgba(255, 255, 255, 0.2)`, white text, shadow-lg
- **Inactive**: Transparent, text: blue-100
- **Hover**: Background `rgba(255, 255, 255, 0.1)`

### Sidebar Footer (User Section)
- **Padding**: 16px (p-4)
- **Border Top**: 1px solid `#1E3A8A` at 50% opacity
- **User Avatar**: 32px × 32px circle, white background, user initial in blue-600
- **Logout Icon**: 20px × 20px, color: blue-200

---

## Chat View Layout

### Messages Container
- **Padding (Mobile)**: 16px (p-4)
- **Padding (Desktop)**: 24px (p-6)
- **Vertical Spacing**: 24px between messages (space-y-6)
- **Max Content Width**: 768px (max-w-3xl)
- **Background**: Transparent (inherits gradient)

### Message Bubbles

#### User Message
- **Alignment**: Right-aligned (justify-end)
- **Layout Direction**: Row-reverse (icon on right)
- **Max Width**: 768px (max-w-3xl)

#### AI Message
- **Alignment**: Left-aligned (justify-start)
- **Layout Direction**: Row (icon on left)
- **Max Width**: 768px (max-w-3xl)

#### Avatar/Icon
- **Size**: 32px × 32px (w-8 h-8)
- **Border Radius**: 50% (rounded-full)
- **Background**: Linear gradient from blue-600 to indigo-600
- **Icon Inside**: 16px × 16px (w-4 h-4), white
- **Gap from Message**: 16px (gap-4)

#### Message Bubble
- **Padding**: 16px (p-4)
- **Border Radius**: 8px (rounded-lg)
- **Shadow**: Small shadow (shadow-sm)
- **Max Width**: ~70% of container

##### User Message Bubble
- **Background**: Linear gradient from `#2563EB` to `#4F46E5`
- **Text Color**: White
- **Min Width**: 60px

##### AI Message Bubble
- **Background**: White
- **Text Color**: `#111827` (gray-900)

#### Message Header (Name)
- **Font Size**: 14px (text-sm)
- **Font Weight**: 500 (medium)
- **Margin Bottom**: 4px (mb-1)
- **Color**: `#374151` (gray-700)

#### Message Timestamp
- **Font Size**: 12px (text-xs)
- **Color**: `#6B7280` (gray-500)
- **Margin Top**: 4px (mt-1)

#### Message Content
- **Font Size**: 14px (sm) or 16px (base)
- **Line Height**: 1.5 (leading-relaxed)
- **Whitespace**: Pre-line (preserves line breaks)

---

## Loading Indicator

### Typing Animation
- **Container**: White background, padding 16px, rounded-lg, shadow-sm
- **Dot Size**: 8px × 8px (w-2 h-2)
- **Dot Color**: `#2563EB` (blue-600)
- **Dot Gap**: 4px (gap-1)
- **Animation**: Bounce with staggered delays (0s, 0.1s, 0.2s)

---

## Quick Action Buttons (Empty State)

### Container
- **Max Width**: 768px (max-w-3xl)
- **Margin Top**: 24px (mt-6)
- **Padding**: 0

### Label
- **Text**: "Quick actions:"
- **Font Size**: 14px (text-sm)
- **Color**: `#4B5563` (gray-600)
- **Font Weight**: 500 (medium)
- **Margin Bottom**: 12px (mb-3)

### Button Grid
- **Layout**: Flex wrap
- **Gap**: 8px (gap-2)

### Quick Action Button
- **Padding**: 8px horizontal (px-4), 8px vertical (py-2)
- **Border Radius**: 8px (rounded-lg)
- **Font Size**: 14px (text-sm)
- **Font Weight**: 500 (medium)
- **Min Height**: 36px

#### Blue Action Button
- **Background**: `#EFF6FF` (blue-50)
- **Text Color**: `#1E40AF` (blue-700)
- **Hover**: `#DBEAFE` (blue-100)

#### Green Action Button (Add Card)
- **Background**: `#F0FDF4` (green-50)
- **Text Color**: `#15803D` (green-700)
- **Hover**: `#DCFCE7` (green-100)

---

## Input Area (Bottom Sticky)

### Container
- **Position**: Sticky bottom
- **Background**: White
- **Border Top**: 1px solid `#E5E7EB`
- **Padding Top**: 12px (pt-3)
- **Padding Bottom**: 12px (pb-3) + safe area inset (min 12px)
- **Padding Horizontal (Mobile)**: 12px (px-3)
- **Padding Horizontal (Desktop)**: 16px (px-4)
- **Z-Index**: 40
- **Width**: 100%

### Input Wrapper
- **Max Width**: 768px (max-w-3xl)
- **Margin**: 0 auto (centered)

### Text Input
- **Type**: Textarea
- **Width**: 100%
- **Min Height**: 44px (iOS touch target minimum)
- **Max Height**: 160px (max-h-40)
- **Padding**: 12px (p-3)
- **Padding Right**: 56px (pr-14) - to accommodate send button
- **Border**: 1px solid `#D1D5DB` (border-gray-300)
- **Border Radius**: 9999px (rounded-full) - pill shape
- **Font Size (Mobile)**: 14px (text-sm)
- **Font Size (Desktop)**: 16px (text-base)
- **Line Height**: 1.5
- **Background**: White
- **Placeholder**: "Ask me about your cards, payments, or which card to use..."
- **Placeholder Color**: `#9CA3AF` (gray-400)

#### Focus State
- **Outline**: None
- **Ring**: 2px solid `#3B82F6` (focus:ring-2 focus:ring-blue-500)

### Send Button
- **Position**: Absolute, right edge
- **Right Offset**: 12px (right-3)
- **Vertical Position**: Center (top-1/2, transform -translate-y-1/2)
- **Size**: 32px × 32px (w-8 h-8)
- **Background**: `#2563EB` (bg-blue-600)
- **Hover Background**: `#1D4ED8` (hover:bg-blue-700)
- **Border Radius**: 50% (rounded-full)
- **Icon**: Send icon, 16px × 16px (w-4 h-4), white
- **Disabled Opacity**: 50% (opacity-50)
- **Disabled Cursor**: not-allowed
- **Transition**: Colors, 150ms

---

## Spacing System (Tailwind to Pixels)

### Padding/Margin Scale
- **p-1**: 4px
- **p-2**: 8px
- **p-3**: 12px
- **p-4**: 16px
- **p-6**: 24px
- **p-8**: 32px
- **p-12**: 48px

### Gap Scale
- **gap-1**: 4px
- **gap-2**: 8px
- **gap-3**: 12px
- **gap-4**: 16px
- **gap-6**: 24px

---

## Border Radius

- **rounded**: 4px
- **rounded-lg**: 8px
- **rounded-xl**: 12px
- **rounded-2xl**: 16px
- **rounded-full**: 9999px (pill/circle)

---

## Shadows

- **shadow-sm**: `0 1px 2px 0 rgba(0, 0, 0, 0.05)`
- **shadow**: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)`
- **shadow-lg**: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`
- **shadow-xl**: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)`

---

## Safe Area Insets (Mobile)

### Bottom Safe Area
- **Minimum Padding**: 12px (0.75rem)
- **Safe Area Padding**: `env(safe-area-inset-bottom)` (typically 34px on iPhone X+)
- **Final Padding**: `max(12px, env(safe-area-inset-bottom))`

### Top Safe Area
- **Used in**: Status bar area
- **Value**: `env(safe-area-inset-top)` (typically 44px on iPhone X+)

---

## Component States

### Buttons
- **Default**: Base color
- **Hover**: Darker shade
- **Active**: Even darker
- **Disabled**: 50% opacity, cursor not-allowed

### Input
- **Default**: Border gray-300
- **Focus**: Ring blue-500, 2px
- **Disabled**: Background gray-100, text gray-400

### Navigation Items
- **Active**: White overlay 20%, shadow
- **Inactive**: Transparent, lighter text
- **Hover**: White overlay 10%

---

## Typography Examples

### Message Content
- **Font**: System font stack
- **Size**: 14px (mobile) / 16px (desktop)
- **Line Height**: 1.5
- **Color**: White (user) / gray-900 (AI)

### Button Text
- **Font**: System font stack
- **Size**: 14px
- **Weight**: 500 (medium)

### Timestamp
- **Font**: System font stack
- **Size**: 12px
- **Color**: gray-500

---

## Mobile-Specific Considerations

1. **Touch Targets**: Minimum 44px × 44px (iOS) / 48px × 48px (Material)
2. **Safe Areas**: Account for notch/home indicator
3. **Keyboard**: Input stays above keyboard when focused
4. **Sidebar**: Overlay/drawer on mobile (hidden by default)
5. **Scroll**: Messages area scrolls independently
6. **Input**: Auto-resizes based on content (min 44px, max 160px)

---

## Layout Hierarchy

```
┌─────────────────────────────┐
│   Mobile Header (optional)  │ ← 64px height
├─────────────────────────────┤
│                             │
│   Messages Container        │ ← Flex-1 (fills space)
│   (scrollable)              │
│                             │
│   - Message 1               │
│   - Message 2               │
│   - Quick Actions (empty)   │
│                             │
├─────────────────────────────┤
│   Input Area (sticky)       │ ← ~68-102px height
│   ┌───────────────────────┐ │
│   │ [Input field]    [→]  │ │
│   └───────────────────────┘ │
└─────────────────────────────┘
```

---

## Sidebar (Overlay on Mobile)

```
┌─────────────────────┐
│ Logo        [X]     │ ← 56px height
├─────────────────────┤
│                     │
│ Navigation Items    │ ← Flex-1
│ - Chat              │
│ - Optimizer         │
│ - Cards             │
│ - Discovery         │
│                     │
├─────────────────────┤
│ User Info    [Logout]│ ← ~72px height
└─────────────────────┘
```

Width: 256px when open

---

## Key Measurements Summary

| Element | Width | Height | Notes |
|---------|-------|--------|-------|
| Artboard | 375-390px | 812-844px | Standard iPhone sizes |
| Mobile Header | 100% | 64px | When sidebar closed |
| Sidebar | 256px | 100vh | When open |
| Message Avatar | 32px | 32px | Circular |
| Message Bubble | Max 70% | Auto | Min height ~40px |
| Input Field | 100% | 44-160px | Auto-resizing |
| Send Button | 32px | 32px | Circular, absolute |
| Quick Action Button | Auto | 36px min | Flex wrap |
| Navigation Item | 100% | 48px min | Full width in sidebar |

---

## Export Specifications for Figma

1. **Create Frame**: 375px × 812px (or 390px × 844px)
2. **Safe Area Guides**: 
   - Top: 44px from top
   - Bottom: 34px from bottom
3. **Components to Create**:
   - Message Bubble (User)
   - Message Bubble (AI)
   - Input Field with Send Button
   - Quick Action Button
   - Navigation Item
   - Sidebar
4. **Auto Layout**: Use Figma Auto Layout for messages, buttons, and input area
5. **Constraints**: Pin input area to bottom with safe area padding

---

## Color Swatches for Figma

Create these color styles in Figma:

1. **Primary Blue**: `#2563EB`
2. **Primary Indigo**: `#4F46E5`
3. **Dark Blue**: `#1E3A8A`
4. **Dark Indigo**: `#312E81`
5. **Background Light**: `#EFF6FF`
6. **Background Lighter**: `#EEF2FF`
7. **Text Primary**: `#111827`
8. **Text Secondary**: `#374151`
9. **Text Tertiary**: `#6B7280`
10. **Border Light**: `#E5E7EB`
11. **Border Medium**: `#D1D5DB`
12. **Success**: `#16A34A`
13. **Error**: `#DC2626`

---

## Notes for Designers

- Use **8px grid** for alignment
- Maintain **minimum 12px spacing** between elements
- **Touch targets** should be at least 44px × 44px
- Test with **safe areas** enabled in Figma mobile preview
- Input field should have **pill shape** (fully rounded)
- All gradients are **linear**, top to bottom or left to right
- Shadows are subtle - use shadow-sm for most elements
- **Icons** from Lucide React library (available as SVG)

---

End of Specifications

