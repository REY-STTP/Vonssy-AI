# Vonssy AI

A BYOK AI chatbot — each user connects their own OpenAI-compatible endpoints (API URL + key + model) through one unified interface.

Built by **Vonssy, the Heavenly Demon King**.

---

## ✨ Features

### Core Chat
- **BYOK Multi-Provider** — Each user stores N custom configs (`label, baseUrl, apiKey, model`) via Settings → AI Gateways. Any OpenAI-compatible API works.
- **Encrypted at rest** — API keys stored AES-256-GCM in `user_ai_models`; clients only ever see `****last4`.
- **Real-time Streaming** — Server-Sent Events (SSE) stream AI responses token-by-token with live typing indicator.
- **Test connection** — One-click non-streaming `POST {baseUrl}/chat/completions` check before chatting.
- **Message Editing** — Edit any user message and regenerate the AI response from that point (truncation-based edit with DB cleanup).
- **Regeneration** — Regenerate any AI response to get a different answer.
- **Message Feedback** — Like/dislike individual AI responses, persisted to the database.

### Session Management
- **Persistent Chat History** — All sessions and messages stored in PostgreSQL with cursor-based pagination.
- **Sidebar** — Collapsible sidebar listing pinned sessions and recent chats. Supports rename, pin/unpin, and delete with real-time UI updates.
- **All Chats Overlay** — Virtualized (via `@tanstack/react-virtual`) full-screen modal listing all chat sessions with search, pinned filter, and infinite scroll pagination.
- **Pin/Unpin** — Pin important sessions to the top of the sidebar; pinned sessions are sorted separately.
- **Auto-titling** — New sessions are automatically titled from the first user message content.

### Authentication & Security
- **Google & GitHub OAuth** — Dual provider sign-in via Auth.js (NextAuth v5) with Drizzle adapter for database sessions.
- **Route Protection** — Next.js 16 proxy (Node.js runtime) redirects unauthenticated users. Every API route independently re-validates sessions server-side (CVE-2025-29927 mitigation). If `NEXTAUTH_URL` is set, the proxy also enforces it as the canonical host (localhost exempt).
- **Per-user ownership checks** — Every model config and chat session query is scoped `WHERE id + userId`; foreign IDs return 404, never 403-differentiated.
- **SSRF guard** — User-supplied `baseUrl` is validated (https-only, block metadata/private IPs) before any server fetch.

### Personalization
- **Preferred Name & Date of Birth** — Set in Settings; the AI uses these contextually via server-side system prompt injection (not client-spoofable).
- **Custom Avatars** — Choose between OAuth profile photo or DiceBear-generated avatars (Croodles Neutral, Lorelei Neutral, Notionists Neutral styles) with customizable seed.
- **Reading Font** — Switch between Inter (sans-serif), Source Serif 4 (serif), and JetBrains Mono (monospace) for AI response rendering.

### Appearance & i18n
- **Dark / Light / System Theme** — Toggle with `next-themes`, persisted across sessions. Theme toggle available on both the login page and chat settings.
- **Bilingual (EN / ID)** — Full internationalization with English and Indonesian translations. Language selector on login page and in settings.
- **Design System** — Custom CSS variables for colors, spacing, and shadows. Warm earthy palette (terracotta accent) with glassmorphism elements.

### UI/UX Polish
- **Markdown Rendering** — AI responses rendered with `react-markdown` + `remark-gfm`. Syntax-highlighted code blocks via `react-syntax-highlighter` with one-click copy.
- **Smart Scroll Button** — Floating button that points down when scrolled up, and automatically transforms into an up-arrow when at the bottom of the thread.
- **Responsive Design** — Mobile-optimized sidebar drawer, responsive settings modal with horizontal tab strip, auto-collapse sidebar on mobile navigation.
- **Toast Notifications** — Sonner toasts with inverted colors for light mode visibility and native styling for dark mode.
- **Keyboard Shortcuts** — Enter to send, Shift+Enter for newline, Escape to cancel editing.
- **404 Page** — Custom not-found page with bilingual text and branded design.
- **Reduced Motion** — Respects `prefers-reduced-motion` media query.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Proxy) |
| Runtime | React 19, TypeScript 5 |
| Styling | Tailwind CSS 3 + Custom Design Tokens |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM + Drizzle Kit |
| Auth | Auth.js (NextAuth v5 beta) + Drizzle Adapter |
| AI Client | OpenAI SDK (compatible with any OpenAI-format API) |
| Virtualization | @tanstack/react-virtual |
| Avatars | DiceBear (croodles-neutral, lorelei-neutral, notionists-neutral) |
| Markdown | react-markdown, remark-gfm, react-syntax-highlighter |
| Toasts | Sonner |
| Theming | next-themes |
| Fonts | Inter, Source Serif 4, JetBrains Mono (Google Fonts) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Supabase](https://supabase.com/))
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))
- GitHub OAuth credentials ([github.com/settings/applications/new](https://github.com/settings/applications/new))
- API keys for at least one AI gateway (SeekAI, XKiro, Nara, or Inception)

### Setup

```bash
# Clone the repository
git clone https://github.com/REY-STTP/Vonssy-AI.git
cd Vonssy-AI

# Install dependencies
npm install

# Copy and configure environment variables
cp .env.example .env.local
# Then edit .env.local with your actual values

# Run database migrations
node migrate.js

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string (port 6543) |
| `AUTH_SECRET` | NextAuth secret (`openssl rand -base64 32`) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | GitHub OAuth credentials |
| `ENCRYPTION_SECRET` | AES-256-GCM key for user API keys (`openssl rand -base64 32`). Rotating invalidates stored keys. |
| `ALLOW_PRIVATE_BASE_URL` | `true` to allow localhost/internal base URLs (dev only) |
| `NEXTAUTH_URL` | App URL for Auth.js callbacks (default: `http://localhost:3000`) |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations from schema |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio (database GUI) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/login/           # Login page + language selector + theme toggle
│   │   ├── page.tsx            # Server component with OAuth forms
│   │   ├── LoginText.tsx       # i18n text components
│   │   └── LoginLanguageSelector.tsx  # Language & theme toggle (client)
│   ├── (chat)/                 # Main chat interface
│   │   ├── page.tsx            # Server component (auth gate)
│   │   └── ChatClient.tsx      # Client orchestrator (sidebar, thread, composer)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth route handler
│   │   ├── chat/               # BYOK SSE streaming endpoint + feedback
│   │   ├── sessions/           # CRUD for sessions + paginated "all" endpoint
│   │   └── user/               # Profile, avatar + models CRUD + test
│   ├── globals.css             # Design tokens, component classes, prose styles
│   ├── layout.tsx              # Root layout (fonts, ThemeProvider, Toaster)
│   └── not-found.tsx           # Custom 404 page
│
├── components/
│   ├── chat/
│   │   ├── Sidebar.tsx         # Collapsible sidebar with pin/rename/delete
│   │   ├── ChatHeader.tsx      # Session title, model badge, kebab menu
│   │   ├── MessageThread.tsx   # Message list with edit, regenerate, feedback
│   │   ├── Composer.tsx        # Chat input with user-model selector
│   │   ├── ModelDropdown.tsx   # User-model picker grouped by host
│   │   ├── AllChatsModal.tsx   # Virtualized all-chats overlay
│   │   ├── SettingsModal.tsx   # Settings (profile, AI gateways, appearance, data)
│   │   └── MarkdownRenderer.tsx # Markdown + syntax highlighting
│   ├── ThemeProvider.tsx       # next-themes wrapper
│   └── UserAvatar.tsx          # OAuth photo or DiceBear avatar
│
├── hooks/
│   ├── useChat.ts              # Chat state, streaming, edit, regenerate (BYOK)
│   ├── useSessions.ts          # Session CRUD, pin, rename, delete
│   ├── useAllChats.ts          # Paginated all-chats with search/filter
│   ├── useUserModels.ts        # User model configs CRUD + selection
│   ├── useLocale.ts            # i18n hook (EN/ID)
│   └── useReadingFont.ts       # Reading font preference
│
├── lib/
│   ├── ai-providers/
│   │   ├── gateway-client.ts   # Per-request OpenAI-compatible client (BYOK)
│   │   ├── types.ts            # Shared types (AIProvider, TokenUsage)
│   │   └── index.ts            # Public exports
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema (users, sessions, messages, user_ai_models, etc.)
│   │   └── client.ts           # Drizzle client (postgres.js driver)
│   ├── user-models/
│   │   └── validation.ts       # Label/URL/key/model validation + masking
│   ├── auth.ts                 # Auth.js full config (with DB adapter)
│   ├── auth.config.ts          # Edge-compatible auth config (providers only)
│   ├── constants.ts            # App-wide constants
│   ├── crypto.ts               # AES-256-GCM encrypt/decrypt for user keys
│   └── ssrf-guard.ts           # Base-URL allowlist for user endpoints
│
├── locales/
│   ├── en.ts                   # English translations
│   └── id.ts                   # Indonesian translations
│
└── proxy.ts                    # Route protection (Next.js 16 proxy)

db/migrations/                  # SQL migration files (Drizzle Kit)
migrate.js                      # Migration runner (loads .env.local, runs files in order)
```

---

## 🗄 Database Schema

| Table | Purpose |
|---|---|
| `users` | Auth.js user records + preferred name, date of birth, avatar settings |
| `accounts` | OAuth account links (Google, GitHub) |
| `sessions` | Auth.js session tokens |
| `verification_tokens` | Email verification (Auth.js) |
| `chat_sessions` | Chat sessions with title, pinned status, model label |
| `messages` | Chat messages with role, content, provider label/model snapshot, feedback |
| `usage_logs` | Token usage tracking per message (prompt/completion tokens, latency) |
| `user_ai_models` | Per-user BYOK configs: label, base_url, encrypted key + hint, model |

---

## 🎨 Design System

The UI uses a warm, earthy color palette with CSS custom properties:

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF9F6` | `#1A1918` |
| `--surface` | `#FFFFFF` | `#232220` |
| `--accent` | `#C15F3C` (terracotta) | `#D97B54` |
| `--text-primary` | `#1F1E1C` | `#EDEAE4` |
| `--danger` | `#B3432B` | `#E06A4C` |

Pre-built component classes: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.input-base`, `.prose-vonssy`.

---

## 🔒 Security Considerations

- **Server-side auth on every API route** — Not relying solely on proxy/middleware (CVE-2025-29927 mitigation).
- **User keys encrypted at rest** — AES-256-GCM with `ENCRYPTION_SECRET`; API never returns full keys, only `****last4`.
- **SSRF guard on custom endpoints** — `https`-only, metadata/private-IP blocking, DNS re-check, 15s timeout.
- **Ownership checks** — Model configs scoped by `(id, userId)`; cross-user access returns 404.
- **Personalization is server-injected** — Display name and DOB are injected into the system prompt server-side, preventing client spoofing.
- **UUID validation** — API endpoints validate UUID format before database queries to prevent PostgreSQL injection errors.

---

## License

This project is private.
