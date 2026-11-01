# CausalFlow Design System Master Architecture
> AI Intelligence & Creator Studio SaaS (Autonomous Documentary Intelligence & Script Studio)

---

## 1. Visual Identity & Color Palette (Blue, Black, and White)

### Dark Mode (Default)
- **Background Root:** `#06080F` (Deep Obsidian)
- **Radial Ambient Glow:** `radial-gradient(ellipse at top, rgba(37, 99, 235, 0.18), transparent 70%)`
- **Elevated Card Surfaces:** `#0E131F` (Elevated Midnight Card)
- **Card Secondary/Subtle Surface:** `#141C2E`
- **Primary Electric Blue:** `#2563EB` (Tailwind `blue-600`)
- **Accent High-Energy Blue:** `#3B82F6` (Tailwind `blue-500`)
- **Glow & Border Active:** `#60A5FA` / `rgba(59, 130, 246, 0.35)`
- **Typography Primary:** `#FFFFFF` (Pure White)
- **Typography Secondary:** `#94A3B8` (Slate-400)
- **Typography Muted:** `#64748B` (Slate-500)
- **Borders & Dividers:** `rgba(255, 255, 255, 0.08)` / `#1E293B`

### Light Mode (Toggle)
- **Background Root:** `#F8FAFC` (Slate-50) / `#FFFFFF`
- **Surface Cards:** `#FFFFFF` (Pure Crisp White) with subtle slate borders
- **Primary Interactive:** `#2563EB` (Electric Blue)
- **Secondary Surfaces:** `#F1F5F9` (Slate-100)
- **Typography Primary:** `#0F172A` (Deep Slate-900)
- **Typography Secondary:** `#475569` (Slate-600)
- **Typography Muted:** `#64748B` (Slate-500)
- **Borders & Dividers:** `#E2E8F0` (Slate-200)

---

## 2. Typography Stack
- **Headings & Body Copy:** `Inter`, `Plus Jakarta Sans`, system-ui, sans-serif
- **Data / Timestamps / Runtime Badges:** `JetBrains Mono`, `ui-monospace`, monospace

---

## 3. Core Component Guidelines

### Responsive Layout
- **Desktop (>= 1024px):** Side-by-side split view.
  - Left Column (40–45% width): Story Radar Feed & Pitch Cards.
  - Right Column (55–60% width): Interactive Documentary Script Studio with block-based Act cards.
- **Mobile (< 1024px):** Sleek segmented tab switcher (`1. Story Radar` | `2. Script Studio`) so it functions like a native mobile app.

### 3-Node Causal Timeline Cards
- **Node 1 (Blue):** Today's Macro Trigger (Current news catalyst)
- **Node 2 (Light Blue):** Historical Parallel (10–30 year historical echo)
- **Node 3 (White / Accent):** Everyday Human Impact (Grocery bill, electricity, job, rent)
- **Active State:** Glowing blue border, elevated card background, electric blue indicator badge.

### Block-Based Documentary Script Studio
- Clean act cards: `COLD OPEN`, `ACT I`, `ACT II`, `ACT III`.
- Blue callout container for `[CapCut Visual Cues]` with camera icons and B-roll notes.
- Editable narration field with dynamic runtime recalculation.
- Quick action buttons: "Copy Clean Voiceover" (strips visual cues & acts for TTS engines like ElevenLabs), "Copy All", "Save Script" (localStorage).
- API Keys Modal for $0 Stack (Groq, Tavily, RSS feeds).
