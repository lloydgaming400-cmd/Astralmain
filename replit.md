# Astral Bot - WhatsApp Bot Dashboard

## Overview

Astral Bot is a WhatsApp-based cultivation/gaming bot with a web dashboard. The bot runs on WhatsApp Web (via `whatsapp-web.js`) and lets users in WhatsApp group chats collect anime spirit cards, earn XP, rank up through cultivation tiers, join sects, and compete on leaderboards. The web dashboard provides QR code pairing for WhatsApp connection and displays leaderboard/ranking data.

The project follows a monorepo structure with three main directories:
- `client/` — React SPA (Vite + TypeScript)
- `server/` — Express API + WhatsApp bot logic
- `shared/` — Database schema and API route definitions shared between client and server

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (client/)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: `wouter` (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query with polling (3s interval for QR status)
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming. Dark-only mystical purple/gold cultivation aesthetic
- **Animations**: Framer Motion for page transitions and effects
- **QR Rendering**: `qrcode.react` (QRCodeSVG) for rendering WhatsApp pairing codes
- **Key Pages**:
  - `/qr` — WhatsApp QR pairing page (default route)
  - `/leaderboard` — User rankings and sect rankings
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend (server/)
- **Framework**: Express 5 on Node.js with TypeScript (run via `tsx`)
- **WhatsApp Integration**: `whatsapp-web.js` with `LocalAuth` strategy (session stored in `.wwebjs_auth/`)
- **Bot Commands**: Text-based commands processed from WhatsApp messages (e.g., `!help`, `!rules`, `!scroll`, `!createsect`, `!joinsect`, `!donate`, `!mysect`, etc.)
- **API Routes**: Defined in `shared/routes.ts` with Zod schemas for type-safe responses
  - `GET /api/qr/status` — Returns connection status and QR code string
  - `POST /api/qr/refresh` — Triggers QR code regeneration
  - `GET /api/stats/leaderboard` — Returns all users and sects sorted by XP
- **Dev Server**: Vite dev server middleware for HMR in development
- **Production**: Built with esbuild (server) + Vite (client), served as static files

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `pg` Pool using `DATABASE_URL` environment variable
- **Schema** (in `shared/schema.ts`):
  - `users` — phoneId (WhatsApp ID), name, xp, sectId, sectTag, lastCardClaim
  - `sects` — name, tag, leaderPhoneId, treasuryXp, membersCount, imageUrl
  - `cards` — ownerPhoneId, malCharacterId, name, series, imageUrl, rarity
- **Migrations**: Drizzle Kit with `db:push` command for schema sync
- **Validation**: `drizzle-zod` generates Zod schemas from Drizzle table definitions

### Storage Layer
- `server/storage.ts` defines an `IStorage` interface with `DatabaseStorage` implementation
- CRUD operations for users, sects, and cards
- Abstracts all database access behind a clean interface

### Game Mechanics (WhatsApp Bot)
- **XP System**: 5 XP per message (normal), 10 XP per message (sect members)
- **Ranking System**: 8 cultivation tiers from "Core Disciple of Mid" (0 XP) to "True Peak Dao of Astral Realm" (50,000 XP)
- **Sect System**: Max 5 sects ever, 20 members per sect, 10,000 XP to create, treasury via donations
- **Card Collection**: Anime character cards with rarity tiers (Common, Rare, Epic, Legendary)

### Build System
- `script/build.ts` handles production builds
- Client built with Vite to `dist/public/`
- Server bundled with esbuild to `dist/index.cjs`
- Selected dependencies are bundled (allowlist) to reduce cold start syscalls

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Uses `DATABASE_URL` environment variable. Drizzle ORM manages the schema
- **WhatsApp Web**: The bot connects to WhatsApp via `whatsapp-web.js`, which runs a headless Chromium instance. Session data is persisted in `.wwebjs_auth/`

### Key NPM Packages
- `whatsapp-web.js` — WhatsApp Web client automation
- `qrcode-terminal` — Terminal QR code rendering (server-side)
- `qrcode.react` — Browser QR code rendering (client-side)
- `drizzle-orm` + `drizzle-kit` — Database ORM and migration tooling
- `@tanstack/react-query` — Server state management
- `framer-motion` — UI animations
- `zod` — Runtime type validation for API contracts
- `wouter` — Client-side routing
- Full shadcn/ui component library (Radix UI primitives)

### Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (required)
- `NODE_ENV` — Controls dev vs production behavior