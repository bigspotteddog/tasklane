# Project Guide

A Next.js starter using the Pages Router, React 19, Tailwind v4, and shadcn/ui. This document describes the stack, layout, and code style so any AI assistant (or developer) can extend the project consistently.

---

## Platform-Owned Files

The platform invokes these in a strict, expected shape. **Modifying or removing the listed entries breaks how the project boots, builds, and serves — the user cannot debug the result.**

### `package.json` scripts

- **Do not modify or remove** the `dev`, `build`, and `start` entries. The platform calls them as `npm run dev`, `npm run build`, and `npm run start` — changing their command or removing them breaks the dev preview and production publish.
- **You may add new scripts** (e.g. `db:migrate`, `codegen`, `seed`) when the user's request needs them. New scripts must not shadow or rename the three reserved entries.

### `next.config.ts`

- **Do not modify or remove** these platform-required flags: `productionBrowserSourceMaps: false`, `experimental.cpus`, `experimental.workerThreads`, `typescript.ignoreBuildErrors`. They keep the build inside the container's memory budget.
- **Do not modify or remove `agentRules: false` either.** Without it, `next dev` writes its own instructions block into this file and every change to it is saved into the project.
- **You may add new options** (e.g. `images`, `redirects`, `headers`, additional `experimental` flags) as long as the listed ones are preserved.
- **Never add an unconditional `assetPrefix` or `basePath`**, even if asked for one directly. They pin every asset URL to one absolute origin. That is invisible on the published domain, but it makes the preview and localhost load their JS chunks from the production build — where those filenames don't exist — so the page renders silently blank with only 404s in the console. When one is genuinely needed, always gate it so development is unaffected: `assetPrefix: process.env.NODE_ENV === 'production' ? '<production-origin>' : undefined`.

#### Host redirects

A canonical-host redirect (apex ↔ www, or a platform subdomain onto the custom domain) is a `redirects()` entry matched on the `host` header:

```ts
async redirects() {
    return [
        {
            source: '/:path*',
            has: [{ type: 'host', value: 'www\\.example\\.com' }],
            destination: 'https://example.com/:path*',
            permanent: true
        }
    ]
}
```

- **Escape the dots.** The `has` host value is matched as an anchored regular expression, so an unescaped `www.example.com` also matches `wwwxexample.com`.
- **Keep `source: '/:path*'` paired with `/:path*` on the destination.** That pair is what preserves the path the visitor asked for.
- **Append, don't replace.** If `redirects()` already returns entries, add to the array.
- **One direction only.** Adding both directions is an infinite loop.
- **Only redirect a host that is not the only working one.** Pointing every visitor at a hostname that is not connected takes the site offline.

### Other framework wiring — do not modify

- `tsconfig.json`, `postcss.config.*`, `next-env.d.ts`. These are fixed by the platform.

If a user's request genuinely requires changing any of the protected entries, stop and surface that to the user explicitly instead of editing silently.

---

## Stack

- **Framework:** Next.js 16 (Pages Router)
- **Bundler:** Turbopack (dev only — `build` runs the default production build)
- **Runtime:** React 19
- **Styling:** Tailwind CSS v4 + `tw-animate-css`
- **UI primitives:** shadcn/ui (style: `base-nova`, base color: `neutral`) on top of `@base-ui/react`
- **Icons:** lucide-react
- **Class utilities:** `clsx` + `tailwind-merge` (combined as `cn()` in `@/lib/utils`)
- **Database:** the project's SQLite database over HTTP through `drizzle-orm/sqlite-proxy` (`src/db/client.ts`)
- **Drag and drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **Toasts:** `sonner` (mounted once in `_app.tsx`, call `toast()` anywhere on the client)
- **Language:** TypeScript

---

## Directory Layout

```
src/
├── pages/          Next.js pages (_app, _document, index, 404, 500, ...)
├── pages/api/      API routes (board, issues, members)
├── components/
│   ├── ui/         shadcn-generated components
│   ├── generals/   shared layout/utility components (layout, seo, logo)
│   └── board/      the issue board: columns, cards, dialogs, filters
├── db/             drizzle schema and the database client (server only)
├── server/         server-only queries, validation and API helpers
├── hooks/          client hooks (use-board keeps board state in sync)
├── lib/            small utilities (utils.ts holds the `cn` helper)
├── constants/      static configuration (board.ts holds statuses, types, priorities)
├── styles/         globals.css
└── types/          shared TypeScript types
public/             static assets
```

## Board App

The site is Tasklane, a lightweight issue board. One page (`src/pages/index.tsx`) loads the board in `getServerSideProps` and hands it to `BoardApp`.

- **Data:** two tables, `issues` and `members`. Issue keys are `TL-<number>` (`ISSUE_KEY_PREFIX` in `src/constants/board.ts`); `number` is assigned on insert as `MAX(number) + 1`. `labels` is a JSON array of strings, `due_date` is `YYYY-MM-DD`, and `status`, `type` and `priority` are plain text validated against `src/constants/board.ts` (no CHECK constraints, so adding a column means adding a status there).
- **Columns:** `STATUSES` in `src/constants/board.ts` is the single source for column order, labels and colors.
- **Ordering:** `position` is a REAL. Moves go through `POST /api/issues/[id]/move` with `{ status, afterId }`; the server places the issue right after `afterId` (or at the top) and renumbers a column only when two positions get too close.
- **Server code:** queries live in `src/server/board.ts`, input checks in `src/server/validate.ts`. API routes stay thin: parse, call, respond through `src/server/http.ts`.
- **Client state:** `useBoard` applies every change optimistically, rolls back and shows a toast when a request fails, and refreshes from `/api/board` every 30 seconds and on window focus (paused while dragging or while a save is in flight).
- **Deep links:** an open issue is reflected in the URL as `?issue=TL-12` with shallow routing.
- **Dates on cards:** anything that depends on today's date comes from `useToday()`, which is `null` during server render, so cards never cause hydration mismatches.
- **Inline editing:** issue titles carry `data-mdlfy-cms="issues:<id>:title"` and member names `data-mdlfy-cms="members:<id>:name"` wherever they render as visible text. Keep it on any new place that shows them.

## Imports

- **Path alias:** Use `@/` (maps to `src/`). Avoid relative paths like `../../`.
- **Type imports:** Use `import type { ... }` first, separated from value imports by a blank line.
- **Multiline imports:** When importing more than 4 items, put each on its own line. Add a blank line before the multiline import. Single-line imports come before multiline imports within the same category.

    ```tsx
    import type { ReactNode } from 'react'
    import type { SiteConfig } from '@/types'

    import { Fragment, useState } from 'react'
    import { cn } from '@/lib/utils'
    import { Layout } from '@/components/generals/layout'
    import { Seo } from '@/components/generals/seo'

    import {
        ONE,
        TWO,
        THREE,
        FOUR,
        FIVE
    } from '@/constants/site'
    ```

    There are no barrel files (`index.ts`) in this project — import each component from its own file.

- **Order:**
    1. Type imports
    2. External packages
    3. Internal modules via `@/`
    4. Constants
    5. Relative imports (avoid when possible)

---

## Icons

Use lucide-react. Lucide exports names without an `Icon` suffix:

```tsx
import { Check, ChevronDown, User } from 'lucide-react'

<Check className='size-4' />
```

Use consistent sizes across a page — typically `size-4` (16px), `size-5` (20px), or `size-6` (24px). Don't mix arbitrary sizes within the same UI.

---

## Components

### shadcn primitives

This project is configured to use shadcn for UI primitives (buttons, inputs, dialogs, etc). Add them with:

```bash
npx shadcn@latest add <name>
```

The CLI installs the component into `src/components/ui/` based on the configuration in `components.json`. Aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/hooks`.

**Never run `shadcn init` or `shadcn create`** — the project is already initialized with its shadcn base CSS inlined into `src/styles/globals.css` (see the `/* ejected from shadcn@... */` block). Init would re-insert `@import "shadcn/tailwind.css"`, which does not resolve in this environment and breaks the build. Never add that import manually either.

After generation, adjust formatting to match the rules above (4-space indent, single quotes, no semicolons).

The CLI may write `import { cn } from "cn"` and add the `cn` npm package. Point that import at `@/lib/utils` and uninstall `cn`. Also check that `@base-ui/react` and `class-variance-authority` ended up in `package.json`; install them if the CLI skipped them.

### Custom components

- File names: kebab-case (`hero-section.tsx`).
- Component names: PascalCase, default-exported when there's one component per file.
- Compose Tailwind class strings with `cn()` from `@/lib/utils`.
- Prefer Tailwind utilities over inline `style`. Use `style` only for runtime-computed values.

---

## Pages Router

- Pages live in `src/pages/*.tsx`.
- `_app.tsx` wraps every page (global layout/providers).
- `_document.tsx` controls the HTML shell.
- Data fetching: prefer `getStaticProps` for static content; use `getServerSideProps` only when per-request data is required.

### Built-in utilities

These ship with the boilerplate — reuse them rather than reimplementing:

- `@/components/generals/seo` — `<Seo>` component for page `<title>`, meta description, and Open Graph tags. Use it on every page. Its `ogImage` prop sets the social preview image and is empty by default; pass a 16:9 image to fill it.
- `@/components/generals/layout` — page layout wrapper.

### SEO titles

Every page title reads `{Page name} - {Site name}`. `<Seo>` builds it, so pass ONLY the page name and let the component append the rest:

```tsx
<Seo title='Pricing' />
```

renders `<title>Pricing - Site</title>`, where `Site` is whatever `siteConfig.name` holds.

- Never repeat the site name in the `title` prop. `title='Pricing | Site'` appends it a second time.
- The separator is a hyphen with a space on each side. Not a pipe, not an en dash, not a colon. `404.tsx` and `500.tsx` write their own `<title>` directly, without `<Seo>`, and use the same separator.
- The home page passes no `title` at all, so it renders the site name on its own. Never pass `title='Home'`.
- Keep the page name short, specific and in sentence case, with no trailing punctuation: `Pricing`, `About us`, `Contact`. It is the part that differs between pages, so spend the words there and never pad it with filler like `Welcome to` or `Our`.
- The site name lives in `siteConfig.name` in `src/constants/site.ts`. Change it there and every title follows. Never hardcode it at a call site.

---

## Storage (runtime object storage)

This project has built-in object storage behind its own CDN host. Read and write it at runtime with the server-only helper `@/lib/modulify/storage`. Prefer the helper over calling the storage HTTP API by hand; if a function you need is missing from the helper, add it there as one more POST instead of working around it.

```ts
import { putObject, listObjects, getObjectText, getSignedUrl, setVisibility } from '@/lib/modulify/storage'

// inside a Pages Router API route (src/pages/api/*.ts) or getServerSideProps:
await putObject('submissions/123.json', JSON.stringify(data), { visibility: 'private' })
const { files } = await listObjects('submissions/')
const raw = await getObjectText('submissions/123.json')
const { url } = await getSignedUrl('invoices/2026-001.pdf', { download: true })
await setVisibility(['brochures/2026.pdf'], 'public')
```

- **Server-only.** Import it only in API routes, `getServerSideProps`, or other server code. It throws in the browser and depends on `process.env.CDN_PRIVATE_KEY`, which is never exposed to the client. Never reference that variable in a client component.
- **Public and private.** Every object is either public or private. A public object is served at its CDN URL to anyone who has the address, so it can be embedded in pages. A private object has no URL at all (`url` is `null` in put and list results) and is readable only by server code.
- **Trust the label, not the folder name.** `putObject`, `listObjects` and `getObject` results carry `visibility` on every file, and `listObjects` returns `folderDetails` with each folder's default plus `rootVisibility`, the default a new file gets at the top level, on every page whatever the prefix. A folder called `private` is not private unless its label says so.
- **Choosing visibility.** Pass `{ visibility: 'public' }` when writing anything a page embeds (images, video, fonts, downloads for everyone) and `{ visibility: 'private' }` for anything handed out selectively (user uploads, form data, exports, per-customer documents). Always pass it explicitly for private data rather than relying on a folder default: clearing storage or deleting a folder removes that folder's default, and later writes into it then follow the top-level default. Without `visibility`, overwriting a file keeps its current visibility and a new file follows its folder, else the top-level default.
- **Serving private or large files.** Check who is asking in your own API route, then either return the bytes from `getObject` or redirect to `getSignedUrl(key)`, a link that works for 15 minutes (`{ download: true }` makes it a save-as link). `getObject` and `getObjectText` refuse objects over 25 MB, so always use `getSignedUrl` for big files. Never store a signed link or embed it in a page, it expires.
- **Functions:** `putObject(key, body, { contentType?, encoding?, visibility? })`, `getObject(key)`, `getObjectText(key)`, `getSignedUrl(key, { download? })`, `listObjects(prefix?, token?)`, `deleteObject(key)`, `deleteObjects(keys)`, `createFolder(name, path?, { visibility? })`, `deleteFolder(path)`, `moveObjects(keys, destination)`, `setVisibility(keys, visibility)`. The `putObject` body is a string, a `Buffer` or a `Uint8Array`: hand binary data over as bytes and the helper base64 encodes it and sets `encoding` for you, so `encoding` only matters for a string body (`'base64'` when the string is already base64, otherwise UTF-8). An option name a function does not know throws instead of being dropped, so a misspelt `visibility` can never quietly write a file public.
- **Errors keep their counts.** A refused request throws a `StorageError` (exported from the helper) carrying `message`, `status` (the HTTP status) and `data`. `data` is `{ deleted, failed, failedKeys }` when `deleteObject` or `deleteObjects` could delete only some keys, the full `setVisibility` result (`changed`, `skipped`, `failed`, `tooLong`, `complete`, `visibility`) when some files could not change side or a folder was too long, and `null` for every other failure. Check `error instanceof StorageError` and read `error.data` to retry only what failed, for example `failedKeys`. Misuse of the helper itself (browser import, unknown option, wrong body type, missing configuration) throws a plain `Error`.
- **Repeat until complete.** `deleteFolder` and `setVisibility` work through a large folder in parts and return `complete: false` while more remains. Call them again with the same arguments until `complete` is `true`. `setVisibility` also returns `tooLong`, the keys left untouched because they are over the key length limits: a file key longer than 1016 bytes, or, the only case that happens in practice, a folder whose path is longer than 1001 bytes and so has no room for the marker file; when it is above zero, nothing failed and `complete` is `true`, the request throws "The object key is too long!" with every count in `error.data`, so move that folder to a shorter path first. `listObjects` returns 50 entries at a time; follow `nextToken` until it is `null`, and if a page token is refused, start again from the first page.
- **Moves keep visibility.** `moveObjects` never changes public or private, and a moved public file gets a new URL, so update every reference to the old one.
- **Caching is automatic.** CDN objects are cached hard at the edge, but every write, overwrite, move, and delete transparently purges that object's cache, so the next fetch always returns the latest bytes. Never append cache-busting query strings (`?v=123`), just reuse the same key to update a file in place. Only when many pages hardcode an asset that must stay byte-stable for a long time (a downloadable release, a pinned dataset) should you write a new versioned key instead of overwriting.
- **Naming.** Organize under clear prefixes (`images/`, `uploads/`, `data/`), keep keys lowercase and hyphenated with no spaces, and name objects by their content rather than a timestamp so URLs stay stable and clean.

## Analytics (reading visitor stats)

This project can read its own visitor analytics, the same numbers as the Analytics tab, at runtime with the server-only helper `@/lib/modulify/analytics`. Prefer the helper over calling the analytics HTTP API by hand; if a call you need is missing from the helper, add it there as one more POST instead of working around it.

```ts
import type { GetStaticProps } from 'next'
import { getStats, getBreakdown } from '@/lib/modulify/analytics'

// inside a page (src/pages/*.tsx):
export const getStaticProps: GetStaticProps = async () => {
    try {
        const [stats, pages] = await Promise.all([
            getStats({ period: '30d' }),
            getBreakdown('page', { period: '30d', limit: 5 })
        ])

        return { props: { visitors: stats.visitors, topPages: pages.rows }, revalidate: 300 }
    }
    catch {
        return { props: { visitors: null, topPages: [] }, revalidate: 60 }
    }
}
```

- **Server-only.** Import it only in API routes, `getStaticProps`, `getServerSideProps`, or other server code. It throws in the browser and reads `process.env.MODULIFY_ANALYTICS_URL` and `process.env.MODULIFY_ANALYTICS_KEY`, which are never exposed to the client. Never reference either variable anywhere except this helper. The analytics API refuses browsers (its key header is not allowed cross-origin) and answers `400` to a key sent in a URL, so the key never goes in a link, a query string or a client bundle.
- **Read only.** The key reads this site's own numbers and nothing else. It cannot switch collection off, clear data, check the tracking installation or run a raw query, and it never reads another site. Those stay in the Analytics tab.
- **Cache on your side.** Each site gets 120 requests a minute and 1200 fresh lookups an hour. A lookup is one question the platform asks its analytics backend: `/overview` costs 9, `/export` 6, `/status` 0 and every other call 1, and an answer the platform already has cached costs 0 (live counts are cached for 15 seconds, ranges that include today for a minute, past ranges for 10 minutes). Read analytics in `getStaticProps` with `revalidate`, as above, or cache the answer in an API route, never once per visitor. Past either limit a call fails with `429`.
- **Ranges.** `period` is `day`, `24h`, `7d`, `30d`, `90d`, `12mo` or `all`, and defaults to `7d`: `day` is today so far, from midnight UTC, `24h` is the current hour and the 23 before it, `7d`, `30d` and `90d` are the last 7, 30 and 90 days counting today, and `12mo` is this month and the 11 before it. For a custom range send `from` and `to` instead, both as `YYYY-MM-DD`, both or neither, `from` on or before `to`, at most 3660 days apart. Every date and bucket time is UTC. `filters` takes up to 10 `{ dimension, operator?, value }` conditions: `dimension` is `page`, `source`, `country`, `browser`, `os` or `device`, `operator` is `is` (the default), `isNot` or `contains`, and `value` is one text or a list of 1 to 20, each at most 500 characters. A `country` value is a two letter country code such as `DE`.
- **Functions:** `getStatus()`, `getRealtimeVisitors()`, `getStats({ period?, from?, to?, filters?, metrics? })`, `getTimeseries({ period?, from?, to?, filters?, interval? })`, `getBreakdown(dimension, { period?, from?, to?, filters?, metrics?, limit?, page? })`, `getOverview({ period?, from?, to?, filters?, interval?, limit? })` and `exportAnalytics({ format? })`. Metric names are camelCase: `visitors`, `visits`, `pageviews`, `viewsPerVisit`, `bounceRate`, `visitDuration`, and `getStats` returns all six unless you name some. Breakdown metrics are the same list without `viewsPerVisit`, default to `['visitors']`, and rank the rows by the first one you name. `interval` is `hour`, `day` or `month` and must fit the range: `day` and `24h` take `hour`; `7d` and `30d` take `hour` or `day` (default `day`); `90d` takes `day`; `12mo` takes `day` or `month` (default `month`); `all` takes `month`; a custom range whose dates are at most 1 day apart takes `hour`, up to 31 days apart `hour` or `day` (default `day`), up to 92 days apart `day`, up to 366 days apart `day` or `month` (default `month`), and further apart `month`. Count the days between `from` and `to`, not the days the range covers: `2026-09-27` to `2026-09-28` is 1 day apart and takes only `hour`, and `2026-09-01` to `2026-09-30` is 29 days apart. An option name the helper does not know throws instead of being dropped. Each function is one POST to `MODULIFY_ANALYTICS_URL` (`/status`, `/realtime`, `/stats`, `/timeseries`, `/breakdown`, `/overview`, `/export`) with the key in an `X-Analytics-Key` header, and every answer is an envelope `{ success, message, data, code }` whose payload is `data`.
- **What comes back.** `getStats`, `getTimeseries`, `getBreakdown` and `getOverview` answers all carry `range` (`{ period, from, to }`: `from` and `to` are `null` for a named period, and a custom range reads `period: 'custom'` with its dates) and `published`. `bounceRate` is a percent and `visitDuration` is in seconds. `getStatus()` returns `{ enabled, collecting, installed, published, lastPublishedAt }` and `getRealtimeVisitors()` the number of people on the published site right now. `getTimeseries` returns `{ interval, partialIndex, points }`: every point carries all six metrics plus `time` (the start of the bucket as an ISO timestamp in UTC) and `partial`, which is `true` for the bucket still in progress and the one after it, so draw partial points differently (a dashed line from `partialIndex`, which is `-1` when nothing is partial) instead of as a drop. `getBreakdown` returns `{ dimension, page, limit, hasMore, rows }` with 8 rows by default and at most 100, pages 1 to 1000; follow `hasMore` for the next page. Each row is `{ value, ...metrics }`, and a country row adds `name` (the country name, `value` is the code). `getOverview` returns `{ interval, totals, series, breakdowns, realtime, status, failed }` in one call, with up to `limit` rows (8 by default, at most 25) of `{ value, name?, visitors }` for each of the six dimensions; a breakdown or the live count that could not load is `null` and named in `failed`, so render the rest. `exportAnalytics()` needs a paid plan, always covers all time (a range option is refused) and returns `{ period: 'all', published, pages, sources, countries, browsers, operatingSystems, devices }` with rows of `{ name, visitors, pageviews }`; `exportAnalytics({ format: 'csv' })` returns the same as CSV text.
- **Unpublished site.** The numbers count the published site only, never the preview. Before the first publish there is nothing to count: every call answers zeros, empty lists and `published: false` and costs no lookup. A site taken offline keeps its history and keeps answering it, with `published: false`.
- **Errors.** A refused request throws an `AnalyticsError` (exported from the helper) carrying `message`, `status` (the HTTP status), `data` (the answer's `data`, `null` when it had none), `retryAfter` (seconds, from a `Retry-After` header) and `retryable`:
    - `400`: an option value the API refused (a bad range, an interval that does not fit it, a bad metric, dimension, `limit`, `page` or filter), or a query the analytics backend refused, whose reason is the message.
    - `401`: `MODULIFY_ANALYTICS_KEY` is no longer valid, usually because it was rotated in the Analytics tab. The published site gets the new key on its next publish.
    - `403`: `exportAnalytics` on the free plan.
    - `413`: a request body over 16 KB.
    - `429`: more than 120 requests in a minute or 1200 lookups in an hour. Wait `error.retryAfter` seconds.
    - `502` and `503`: the analytics backend failed, timed out, or is busy or rate limited. `503` also carries `retryAfter`.
    - `500`: something failed on the platform's side.
    - Status `0`: the analytics service could not be reached or did not answer within 30 seconds.

    `retryable` is `true` for status `0`, `429`, `502` and `503`. A failure is never answered with zeros, so every number that comes back is real. Misuse of the helper itself (browser import, an unknown option such as a range sent to `exportAnalytics`, options that are not an object) and missing configuration (an empty `MODULIFY_ANALYTICS_URL` or `MODULIFY_ANALYTICS_KEY`) throw a plain `Error` before any request is made, so they never arrive as an `AnalyticsError` status. Page data functions (`getStaticProps`, `getServerSideProps`) must fall back to empty content on ANY error, as in the example, so analytics can never fail a build or a page; an API route should answer the error instead (for example `503` when `retryable`).
- **Turning it on.** There is nothing to switch on. Both variables are managed by the platform: the preview gets them when it starts, and the published site gets them on its next publish. Until then every call throws a plain `Error` saying analytics is not configured.

## Email (transactional sending)

This project can send transactional email from its own address. Send it at runtime with the server-only helper `@/lib/modulify/email`. Prefer the helper over calling the email HTTP API by hand or adding an SMTP library. When the user chooses a mail service of their own instead (Resend, SendGrid and the like), put that code in its own server file with its key in Secrets; features they did not move stay on the helper. The helper is platform-owned: never edit it, rename it or write it from memory. When the file is missing, or lacks a function you need, call `get_site_email_helper` and write what it returns at exactly `src/lib/modulify/email.ts`, byte for byte, replacing the old copy. Put any wrapper of your own in a separate server file that imports from `@/lib/modulify/email`, because the next refresh overwrites anything added to the helper itself.

```ts
import { sendEmail, getEmail, listEmails, getEmailQuota, EmailError } from '@/lib/modulify/email'

// inside a Pages Router API route handler (src/pages/api/*.ts):
const { id, accepted, suppressed, remaining, duplicate } = await sendEmail({
    to: 'Ada Lovelace <customer@example.com>',
    subject: 'Your order is confirmed',
    html: '<p>Thanks for your order, it is on its way.</p>',
    text: 'Thanks for your order, it is on its way.',
    replyTo: 'support@example.com',
    tags: [{ name: 'type', value: 'order-confirmation' }],
    idempotencyKey: `order-confirmation-${order.id}`
})

const email = await getEmail(id)
const { items, nextCursor } = await listEmails({ limit: 20, status: 'bounced' })
const { usage, limits, enabled, available, fromAddress, tracking } = await getEmailQuota()

try {
    await sendEmail({ to: submission.email, subject: 'We got your message', text: submission.message, idempotencyKey: `contact-${submission.id}` })
}
catch (error) {
    if (!(error instanceof EmailError)) throw error
    return res.status(error.retryable ? 503 : 400).json({ message: error.message })
}
```

- **Server-only.** Import it only in API routes, `getServerSideProps`, or other server code. It throws in the browser and reads `process.env.EMAIL_URL` and `process.env.EMAIL_PRIVATE_KEY`, which are never exposed to the client. Never reference either variable in a client component, and never read `EMAIL_URL` or `EMAIL_PRIVATE_KEY` anywhere except this helper.
- **Turning it on.** Sending is on by default for every site, so both variables appear on their own the next time the preview starts or the site is published. They also appear at once when sending is turned on, or when the key is revealed or rotated in the site's Emails tab, even while sending is off. The preview gets them straight away; the published site gets them on its next publish, and again after the key is rotated. Until then every call throws a plain `Error` saying email is not configured. Once they exist, a call made while sending is off throws an `EmailError` with status `403` and code `disabled` instead (`data.source` says who turned it off, and is `null` when nobody is recorded as turning it off), so handle both.
- **From address.** Every message leaves from the address the Emails tab shows, which `getEmailQuota()` returns in `fromAddress`: the site's built-in address on its own `prj-...` subdomain, or an address on a domain of the user's own once they add it under "Email domains" in the Emails tab, verify it and choose it to send from (a paid plan feature the user sets up with their DNS records, never in code). While that domain is not verified, mail goes out from the built-in address and `fromAddress` says so. Never hardcode a From address or a domain, because the sending domain can change from the dashboard. The part in front of the `@` and the display name are set in the Emails tab, and `fromName` overrides the display name for one message (at most 64 characters).
- **Incoming mail is forwarded, never received by the site.** Mail sent to any address on the built-in subdomain, or on a domain of the user's own whose receiving is turned on in the Emails tab, is forwarded by the platform to the site's confirmed forwarding addresses while forwarding is on. Those start with the workspace owner's own account email, and the user adds or removes them (up to 5, most confirmed through a link they get by email) under "Forwarding" in the Emails tab or by asking chat, never in code. Forwarding is on by default, keeps running while sending is off, and is turned on or off the same way, never in code. Nothing hands incoming mail to this project: there is no inbox, webhook or API for it, so never build an inbox or a reply parser. Without `replyTo`, a reply goes to the reply-to address set in the Emails tab, or to the sending address when none is set, which reaches the forwarding addresses through forwarding on the built-in subdomain or a receiving domain and the domain's own mailboxes otherwise, so pass `replyTo` when somebody else should answer, such as the visitor's own address on a contact form notification.
- **Notify the owner of form submissions.** A form someone has to act on (contact, booking, quote, order) emails each submission from its server route with `sendEmail({ to: (await getEmailQuota()).fromAddress, replyTo: visitorEmail, subject, html, text, idempotencyKey: submissionId })`. Sending to the site's own address means forwarding delivers it to the site's forwarding addresses, which start with the workspace owner's account email (when the site sends from a domain of the user's own whose receiving is off, that domain's own mailboxes get it instead), so never hardcode anyone's address, and send to a specific address only when the user names one. Escape whatever the visitor typed, put every field in both `html` and `text`, and still save the submission so nothing is lost when the email fails. While forwarding is off, or no forwarding address is confirmed, mail to the site's own address is dropped.
- **Allowance.** Each site includes 50 emails a calendar month on Free, 10,000 on Starter, 30,000 on Pro and 50,000 on Enterprise, and they reset at `usage.resetsAt` (the start of next month, in UTC). Past that a paid plan keeps sending: every further block of 2,000 emails costs AI credits from the workspace (`usage.blockCredits` says how many), charged automatically the moment a send needs it, and emails left from a block carry over to the next month. With no credits left for the next block, every send fails with `403` and code `no-credits` until credits are added; a free site fails with `403` and code `plan-limit` until the month resets or the workspace moves to a paid plan, and a message that needs more emails than are left is refused whole. A recipient is a send, so one message to 5 people uses 5 of the allowance. Build transactional mail for people who asked for it (receipts, password resets, contact form notifications), never a list blast.
- **Limits per message.** At least one `to` address and at most 50 unique recipients across `to`, `cc` and `bcc` together (an address repeated across them counts once, `to` wins over `cc` and `cc` over `bcc`, but more than 100 entries across the three before duplicates are removed is refused too), at most 10 `replyTo` addresses (and at most 20 entries before duplicates are removed), display names of at most 128 characters, a subject of at most 300 characters with no line breaks, and `html` and `text` of at most 400,000 characters each, with at least one of them present; send both when you can. A `<script>` tag in `html` is refused. The site sends at most 60 emails a minute. `getEmailQuota()` returns the live numbers in `usage` and `limits` (`maxRecipients`, `perMinute`, `maxAttachments`, `maxAttachmentBytes`, `maxSubject`, `maxBody`, `maxTags`, `maxHeaders`), so read them before a batch instead of hardcoding these, and pace anything bigger than a handful of messages.
- **Functions:** `sendEmail({ to, subject, html?, text?, cc?, bcc?, replyTo?, fromName?, attachments?, headers?, tags?, idempotencyKey? })`, `getEmail(id)`, `listEmails({ limit?, cursor?, status?, recipient?, engagement? })` and `getEmailQuota()`. `to`, `cc`, `bcc` and `replyTo` each take one address or an array of them, as a bare address or as `Name <address>`. Every address must be valid: one bad address refuses the whole message and nothing is silently dropped or shortened. An option name the helper does not know throws instead of being dropped, so a misspelt `replyTo` can never quietly send a message whose replies go somewhere you did not intend. Each function is one POST to `EMAIL_URL` (`/send`, `/email`, `/emails`, `/quota`) with the key in an `X-Email-Key` header, and every answer is an envelope `{ success, message, data, code }` whose payload is `data`.
- **What comes back.** `sendEmail` resolves with `{ id, messageId, accepted, suppressed, remaining, reason, duplicate }`: `id` is the email's id for `getEmail`, `accepted` is who it went to, `suppressed` is the addresses dropped because they were blocked before (see below), and `remaining` is what is left of the month's allowance. `getEmail(id)` returns one email this site sent with `from`, `to`, `cc`, `bcc`, `replyTo`, `subject`, `status`, `recipients` (each with `email`, `kind`, `status` and a `detail` such as the bounce reason), `events` (a timeline of `{ type, recipient, at, detail }`), `tags`, `attachments` (file name, type and size only), `error`, `errorCode`, `html` and `text`. `bodyStored` is `false` for an email sent before bodies were kept, and `bodyTruncated` is `true` when a body over 200,000 characters was cut in storage (never in the email itself). `listEmails` returns `{ items, nextCursor }`, newest first, 20 by default and at most 100 per page, without bodies: pass `nextCursor` back as `cursor` until it is `null`, and filter with `status` (one message status), `recipient` (one address) or `engagement` (see open and click tracking below). `getEmailQuota()` returns `{ usage, enabled, available, fromAddress, limits, tracking }`, where `usage` carries `sent`, `included`, `purchased` (emails bought this month, in `overageBlocks` blocks), `carriedOver` (bought earlier and not used yet), `allowed` (`included` plus `carriedOver` plus `purchased`), `remaining`, `blockSize`, `blockCredits` (the credits one more block costs), `canBuyMore` (`false` on Free), `isPaid`, `resetsAt` and `paused`, which is `null` while the site can send and otherwise `{ reason, since, refused }`, with `reason` `plan-limit` or `no-credits`, so read it before a batch and skip sending while it is set. Emails stay in the history until someone removes them or clears the history in the Emails tab.
- **Delivery is per recipient and arrives later.** `sendEmail` resolves as soon as the mail provider accepts the message, so a resolved send means `sent`, not delivered. Delivery, bounces, spam reports and delays arrive afterwards: read them with `getEmail`. A message is `pending`, `sent`, `delayed`, `delivered`, `partial` (some recipients delivered and others failed), `bounced`, `complained` (marked as spam), `rejected` or `failed`. Each recipient is `pending`, `sent`, `delivered`, `delayed`, `bounced`, `complained`, `rejected`, `failed` or `suppressed`. A temporary bounce shows as `bounced` with a `detail` starting `Temporary bounce, so the address was not blocked.`, and never blocks the address; `delayed` means the provider is still retrying. A recipient skipped because it was blocked does not change the message status unless every recipient was skipped.
- **Open and click tracking.** Tracking is a site setting, **Track opens and clicks** on the Settings tab of the Emails tab, and it is on by default, so it stays on until someone turns it off there or asks chat to. Code cannot switch it: `getEmailQuota()` only reports it, in `tracking` as `{ available, enabled }`, where `available` is `false` while tracking is not set up on the platform. With it on, every message with an `html` body gets an invisible tracking image, and every link in the `html` goes through a tracking address on its way to the real destination. `text` is never changed, so a message with only a `text` body is never tracked. Never add a tracking image or rewrite links yourself. Put the `ses:no-track` attribute on a link to leave it untouched, as in `<a ses:no-track href="https://example.com/reset?token=...">`, and always do that on password reset, sign in and any other link that carries a token, because the full clicked address, query string included, is kept in the email's history. Opens are approximate, because some mail apps load images automatically and others block them, so never treat an open as proof that somebody read the email. Opens and clicks belong to the whole message, never to one recipient, and never change `status`. Every email from `listEmails` and `getEmail` carries `tracked` (`false` for an email sent while tracking was off or not set up, or with no `html` body), `opens`, `clicks`, `firstOpenedAt` and `firstClickedAt`; `getEmail` adds `lastOpenedAt`, `lastClickedAt`, `links` (`{ url, clicks, firstClickedAt, lastClickedAt }` for each clicked link, most clicked first, at most 50 different links) and `opened` and `clicked` entries in `events` for the first open and for the first click on each link. `listEmails({ engagement })` keeps only tracked emails that were `opened`, `clicked`, or delivered and `not-opened` (a later spam report or bounce does not take a delivered email out of `not-opened`), and `all` keeps every email. A site that tracks should tell its recipients, for example in its privacy policy.
- **Blocked addresses.** An address that bounced permanently, marked the site's mail as spam, or was blocked in the Emails tab, on its own or through its whole domain, is dropped from every later message and listed in `suppressed`, while the rest still go out. When every recipient is blocked, nothing is sent and the call fails with `400` and code `all-suppressed`. Repeated bounces or spam reports switch sending off for the whole site (`403`, code `disabled`), and only the Emails tab can turn it back on.
- **Attachments.** `attachments` takes up to 10 `{ filename, content, contentType?, contentId?, disposition? }` objects adding up to at most 7 MB. `contentType` is a MIME type such as `application/pdf`; parameters such as `text/csv; charset=utf-8` are accepted and only the bare type is sent. A `contentId` is printable text without spaces. `content` is a base64 string (a `data:` URL prefix and line breaks are removed for you), a `Buffer`, a `Uint8Array` or an `ArrayBuffer`, which the helper encodes. The filename cannot contain slashes or line breaks, and executable and script types (`.exe`, `.bat`, `.js`, `.msi`, `.vbs`, `.ps1` and the rest of the mail provider's blocked list) are refused. An attachment with a `contentId` (for example `logo`) is inline by default and the html shows it as `<img src="cid:logo">`; without one it is a regular attachment, and `disposition` (`'inline'` or `'attachment'`) overrides either. Only the file name, type and size are kept afterwards, never the content.
- **Headers and tags.** `headers` is an object of up to 10 extra headers: names starting with `X-` (except `X-SES-`, which the mail provider reserves), plus `List-Unsubscribe` and `List-Unsubscribe-Post`, each name once and each value printable ASCII only, with no line breaks, at most 995 characters and at most 996 together with the header name. `tags` is up to 10 `{ name, value }` pairs using only letters, digits, dashes and underscores (up to 256 characters each), returned again by `getEmail` and `listEmails` so you can tell your own emails apart. `project` and `send` are reserved tag names.
- **Idempotency.** Pass an `idempotencyKey` (1 to 256 printable characters, for example `order-confirmation-<order id>`) on every send that could be retried; the helper also sends it as an `Idempotency-Key` header. When you pass none, the helper sends a random key it makes for that call, which protects only that one request: calling `sendEmail` again makes a new key, so a retry you make yourself is only safe with your own key or with `error.idempotencyKey`, the key the failed call used. Sending again with the same key and the same content never sends a second email: it resolves with the original `id` and `duplicate: true`. The same key with different content fails with `409` and code `idempotency-conflict`, and a repeat while the first attempt is still going out fails with `409` and code `idempotency-pending`, which is worth retrying.
- **Errors.** A refused request throws an `EmailError` (exported from the helper) carrying `message`, `status` (the HTTP status), `code` (the machine code from `data.code`, `null` when the answer carried none), `data` (the full answer, including `invalid`, `suppressed`, `remaining`, `reason` and `source`), `retryable` and `retryAfter` (seconds, from a `Retry-After` header). Branch on `code`, not on the message text:
    - `400`: `invalid`, the message is not valid as written, and `data.invalid` lists every bad address; `all-suppressed`, every recipient is blocked.
    - `401`: `EMAIL_PRIVATE_KEY` is missing or no longer valid, usually a key rotated in the Emails tab that the published site gets on its next publish.
    - `403`: `disabled`, sending is turned off for this site (`data.reason` says why when it was turned off automatically); `plan-limit`, the free allowance is used up for the month; `no-credits`, a paid site is past its allowance and there are no credits left to buy more.
    - `409`: `idempotency-conflict` or `idempotency-pending`, see above.
    - `413`: `too-large`, a body over 400,000 characters, attachments over 7 MB, or a request over 10 MB.
    - `422`: `provider-rejected`, the mail provider refused this message and `data.reason` says why. Change the message, never retry it unchanged.
    - `429`: `rate-limited`, more than 60 emails in a minute. Wait `error.retryAfter` seconds.
    - `502`: `provider-failed`, the mail provider could not take the message.
    - `503`: `unavailable`, `provider-busy`, `provider-paused` or `charge-failed`, a temporary problem on the platform's side; or `provider-unconfirmed`, the mail provider got the request but did not confirm it in time, so the email may still be delivered. Retry that one only with the same `idempotencyKey`: the retry answers `409` `idempotency-pending` until the provider confirms, then resolves with `duplicate: true`, and if the provider never confirms, the email is marked failed after 15 minutes and the next retry sends it. A retry without a key can deliver it twice.
    - `504`: no `code`, because the CDN answers it: the request timed out between the CDN and Modulify, so the email may already have been sent. Retry only with the same `idempotencyKey`: the retry resolves with `duplicate: true` if the first request sent it, fails with `409` `idempotency-pending` while that request is still going out, and sends it if it never reached the mail provider. A retry without a key can deliver it twice.
    - Status `0`: the email service could not be reached or did not answer within 60 seconds, so the email may or may not have gone out. Retrying with the same `idempotencyKey` is always safe.

    `retryable` is `true` for `409` `idempotency-pending`, `429`, `502`, `503`, `504` and status `0`: queue those and try again later. Everything else needs a changed message, a person in the Emails tab, or a plan change, so tell the visitor or log it instead of retrying. Misuse of the helper itself (browser import, unknown option, wrong option type, missing configuration) throws a plain `Error`.

## Styling

- Tailwind utilities for everything.
- Custom CSS only in `src/styles/globals.css` and only when utilities can't express it. Append to the file — never rewrite it from scratch, and never remove the inlined `/* ejected from shadcn@... */` block or add an `@import "shadcn/tailwind.css"` line.
- shadcn theme tokens are defined as CSS variables in `globals.css` — reference them via Tailwind (`bg-background`, `text-foreground`, etc.) rather than hex/HSL literals.

### Animation

Motion needs nothing installed. Two layers ship with the project:

1. Tailwind's own animation and transition utilities (`transition-*`, `duration-*`, `delay-*`, `ease-*`, `animate-spin`, `animate-pulse`).
2. `tw-animate-css`, imported on line 2 of `globals.css`, which adds enter/exit classes: `animate-in`, `animate-out`, `fade-in`, `fade-out`, `zoom-in`, `zoom-out`, `slide-in-from-*`, `slide-out-to-*`, and `repeat-*`. Combine them with the duration/delay/ease utilities above.

```tsx
<div className='animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out'>
```

For custom motion, append your own `@keyframes` to the end of `globals.css` — append, never rewrite the file. Reach for an animation library only when the design genuinely needs orchestration, physics, or timeline control that CSS can't express.

Respect `prefers-reduced-motion` for anything that moves more than a few pixels.

### Fonts

Fonts are wired across two files that must agree. Changing one without the other is the most common way a font silently does not apply.

1. `src/pages/_app.tsx` loads the faces with `next/font` and writes them to `:root` as `--font-app-sans`, `--font-app-mono` and `--font-app-heading`.
2. `src/styles/globals.css` maps those onto the Tailwind tokens inside `@theme inline`, which is what makes the `font-sans`, `font-mono` and `font-heading` utilities resolve.

To change the site's typeface, swap the loader in `_app.tsx` and keep the same `--font-app-*` names. `globals.css` needs no change at all:

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const sans = Inter({
    subsets: ['latin']
})

const mono = JetBrains_Mono({
    subsets: ['latin']
})
```

For a separate display face, load it as well, point `--font-app-heading` at it, and use `font-heading` on headings.

Rules that keep this working:

- **Font tokens belong in `@theme inline`, never plain `@theme`.** Plain `@theme` emits the token at `:root` and resolves its `var()` there, so a face declared anywhere below `:root` resolves to nothing and every element silently falls back to the browser default serif. `@theme inline` resolves at the element that uses the utility instead.
- **Never write a self-referential token** such as `--font-sans: var(--font-sans)`. That is a CSS cycle and makes the token invalid at computed-value time.
- **Keep the fallback stack inside every token** (`var(--font-app-sans, ui-sans-serif, system-ui, sans-serif)`), so a renamed or missing variable degrades to a system font instead of disappearing.
- **Declare the faces at `:root`, not on a wrapper element.** shadcn overlays (dialog, dropdown, select, tooltip) portal to `document.body`, which sits outside any wrapper and would otherwise lose the font. If you ever do declare a face on an element instead, put `font-sans` on that same element so the token still resolves there. The wrapper in `_app.tsx` already carries it for exactly this reason.
- **Never append `@import url('https://fonts.googleapis.com/...')` to `globals.css`.** CSS requires every `@import` to precede all other rules, so one added at the bottom is dropped without warning. Use `next/font` or an `@fontsource` package.

---

## TypeScript

- Keep types close to their use. Put cross-cutting shared types in `src/types/index.ts`.
- For component props, declare a local `interface ComponentProps { ... }` at the top of the file.
- Prefer `unknown` + narrowing over `any`.

---

This file is intended to evolve. If you (the assistant or developer) introduce a new convention, update this document so future contributors stay aligned.