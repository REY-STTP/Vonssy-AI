# Vonssy AI

A multi-provider AI chatbot that lets you converse with various AI models — Claude, ChatGPT, Qwen, Grok, DeepSeek, Mercury — through one unified interface, powered by free-tier gateways.

Built by **Vonssy, the Heavenly Demon King**.

## Features

- **Multi-Provider Gateway** — Route prompts to different AI backends (SeekAI, XKiro, Nara, Inception) through a single OpenAI-compatible interface. Automatic 429 fallback retries across gateways.
- **Model Selector** — Switch between models (Claude Opus 4.8, Claude Fable 5, ChatGPT 5.5/5.6, Qwen 3.8 Max, DeepSeek V4 Pro, Grok 4.5, Mercury 2) from a dropdown with provider-branded sigil icons.
- **Real-time Streaming** — Server-Sent Events (SSE) stream AI responses token-by-token.
- **Session Management** — Persistent chat history stored in PostgreSQL. Create, rename, delete, and switch between sessions from a collapsible sidebar.
- **Authentication** — Google & GitHub OAuth via Auth.js (NextAuth v5) with Drizzle adapter.
- **Personalization** — Set a preferred name and date of birth in Settings; the AI uses these contextually in conversations (server-side injection, not client-spoofable).
- **Rate Limiting** — Per-user daily request limits with real-time quota display.
- **Dark / Light Theme** — System-aware theme toggle with `next-themes`.
- **Markdown Rendering** — AI responses rendered with `react-markdown`, syntax-highlighted code blocks via `react-syntax-highlighter`, and GFM support.
- **Responsive Design** — Mobile sidebar drawer, responsive settings modal with tab strip on small screens.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Database | PostgreSQL (Supabase) |
| ORM | Drizzle ORM |
| Auth | Auth.js (NextAuth v5 beta) |
| AI Client | OpenAI SDK (compatible with any OpenAI-format API) |
| Fonts | Inter, JetBrains Mono (Google Fonts) |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (e.g. [Supabase](https://supabase.com/))
- Google OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com/apis/credentials))
- API keys for at least one AI gateway (SeekAI, XKiro, Nara, or Inception)

### Setup

```bash
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
| `SEEKAI_API_KEY` | SeekAI gateway key |
| `XKIRO_API_KEY` | XKiro gateway key |
| `NARA_API_KEY` | Nara gateway key |
| `INCEPTION_API_KEY` | Inception Labs gateway key |

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio |

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/       # Login page
│   ├── (chat)/             # Main chat page + client component
│   └── api/
│       ├── auth/           # NextAuth route handler
│       ├── chat/           # SSE chat streaming endpoint
│       ├── rate-limit/     # Rate limit status
│       ├── sessions/       # CRUD for chat sessions & messages
│       └── user/           # User profile (preferred-name, date-of-birth)
├── components/chat/        # Sidebar, MessageThread, Composer, ModelDropdown,
│                           # SettingsModal, MarkdownRenderer, SigilIcons
├── hooks/                  # useChat, useSessions, useRateLimit
└── lib/
    ├── ai-providers/       # Gateway client, registry, model catalog
    ├── db/                 # Drizzle schema & client
    ├── auth.ts             # Auth.js config
    └── rate-limit.ts       # Rate limiting logic

db/migrations/              # SQL migration files
```

## License

This project is private.
