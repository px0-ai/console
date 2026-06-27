# px0 console

Management UI for [px0](https://github.com/px0-ai/px0), the Open Source Prompt Infrastructure.

px0 console is a Next.js web app that connects to the px0 Go API. It lets you create and version prompts, organize them into collections, and manage API keys without touching any application code.

## Getting started

Make sure you have Node.js 22+ installed. The console communicates with the px0 Go server, which you should start first (see [px0/README.md](../px0/README.md)).

First, install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

The site will be available at `http://localhost:3001`. The dev server runs on port 3001 to avoid conflicting with Grafana, which the px0 stack starts on port 3000. The dev server supports hot reload, so changes to components and styles reflect instantly.

## Environment variables

| Variable              | Default                  | Description                |
| --------------------- | ------------------------ | -------------------------- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000`  | Base URL of the px0 Go API |

## Building for production

```bash
npm run build
```

Output is written to `.next/`. Preview the production build locally with:

```bash
npm run start
```

## Project structure

```
src/
  app/          # Next.js App Router (pages, layouts, auth/dashboard routes)
  components/   # Shared UI components (auth, layout, ui primitives)
  contexts/     # React Contexts (AuthContext for session state)
  lib/          # Shared utilities (typed fetch wrapper, types, class mergers)
```

## Stack

- [Next.js 15](https://nextjs.org) - React framework (App Router, TypeScript)
- [Tailwind CSS v3](https://tailwindcss.com) - utility-first CSS framework
- [Lucide React](https://lucide.dev) - icon library
- `src/lib/api.ts` - typed fetch wrapper around the px0 Go API
