# Academic Publishers — redesigned website

Redesign of academicpublishers.in: blue · violet · green theme, a symbol on every tab,
real book covers, working search and subject filters, and a visitor counter
(Netlify Function + Netlify Blobs) in the footer.

## Folder layout (keep it exactly like this)
```
academic-publishers-site/
├── index.html                    ← the whole site (phone, tablet, desktop)
├── images/covers/                ← 92 book covers from academicpublishers.in
├── catalogues/                   ← the 5 catalogue / price-list PDFs + thumbnails
├── data/                         ← publication matrix: books.js, publications.csv, publications.json
├── netlify.toml                  ← tells Netlify where things are
├── package.json                  ← installs @netlify/blobs for the counter
├── .gitignore
└── netlify/
    └── functions/
        ├── counter.mjs           ← the visitor counter (/api/counter)
        └── ask.mjs               ← the book assistant (/api/ask, Gemini)
    └── lib/catalogue.mjs        ← the matrix the assistant reads
```

## Site map (same as the original site)
Each tab has its own link you can share:
`#home` · `#about` · `#publish` · `#proposal` (Book Proposal Form) · `#custom` ·
`#resellers` · `#catalogue` (Bengali, Mathematics, Medical catalogues + English/Bengali price lists) ·
`#publication` · `#buy` · Contact (footer) · Terms · Privacy.

## Deploy (GitHub → Netlify)
1. GitHub → **New repository** → name it e.g. `academic-publishers-site` → Create.
2. **Upload files** → drag in everything *inside* this folder (including the `netlify`
   and `images` folders and the hidden `.gitignore`) → Commit.
3. Netlify → **Add new project → Import an existing project → GitHub** → pick the repo.
4. Leave the build settings as Netlify reads them from `netlify.toml`
   (publish `.`, functions `netlify/functions`, no build command) → **Deploy**.
5. Open the live site: the two counter pills appear at the bottom after the first load.

## Counter notes
- Drag-and-drop on Netlify Drop does NOT run functions — use the GitHub route.
- Opening index.html directly from your computer hides the counter (no function there); that is expected.
- "Unique" = once per browser. Different devices, private windows or cleared browser data count again.
- Common bots and link-preview crawlers (WhatsApp, Telegram, Google etc.) are ignored.
- To reset counts: Netlify → your site → Blobs → store `visitor-counter` → delete key `counts`.
- To start from a number, e.g. 100: change `{ total: 0, unique: 0 }` in counter.mjs before the first visit.

## Fill these in before going live
The page shows yellow tags where real details are needed:
- **Buy Online → Order online**: replace `ADD STORE LINK` and point the "Shop now" button at the live store.
- **Our Resellers**: replace each `ADD DISTRIBUTOR NAME, CITY, PHONE` with real resellers.
- The proposal and contact forms open the visitor's email app addressed to
  contact@academicpublishers.in. To receive them as form submissions instead,
  add `data-netlify="true"` to the two `<form>` tags and remove the `mailto` lines in the script.

## Book covers
Covers are the publisher's own images, converted to web RGB (some originals were CMYK).
To add more, drop a 200×300 JPEG into `images/covers/` and add an entry to `BOOKS` in index.html.

## Catalogues
The five PDFs in `catalogues/` are the ones published on academicpublishers.in:
Bengali catalogue (Dec 2012), Mathematics and Medical catalogues (2015–16),
English and Bengali price lists (2015–16). Each card shows its edition date.
To update one, replace the PDF (keep the same file name), regenerate its thumbnail
(first page as JPEG, same name), and change the edition/pages/size in `CATALOGUES` in index.html.

## Subject and book pages
- Every subject has its own landing page: `#category/medical-science`, `#category/mathematics-and-statistics`,
  `#category/higher-secondary-and-jee`, `#category/computer-science`, `#category/physics-and-chemistry`,
  `#category/biological-science`, `#category/management-and-economics`, `#category/social-science`,
  `#category/bengali`, `#category/geography`, `#category/polytechnic` — with topic filters and sorting.
- Every title has its own page: `#book/<id>` (e.g. `#book/quest-ug-medicine`) with cover, details,
  buy / order / review-copy buttons, share link and "More in this subject".
- "Buy this book" opens the title's page on academicpublishers.in, where the existing cart and payment live.

## Publication matrix (the book list)
All 92 titles live in one table, used three ways:
| File | Used by |
|---|---|
| `data/books.js` | the website (pages, search, offline assistant) |
| `data/publications.csv` / `.json` | people — open in Excel / Google Sheets (also downloadable from the Catalogue page) |
| `netlify/lib/catalogue.mjs` | the Gemini assistant's instructions (compact `id|title|authors|…` matrix) |

To add or change a title: edit the entry in `data/books.js` (fields: id, t = title, a = authors, y = year,
c = subject key, sub = topic, ed, isbn, price, desc, soon), add a cover `images/covers/<id>.jpg`,
and add the same line to the matrix in `netlify/lib/catalogue.mjs`.
Subject keys: med, math, hs, cs, phy, bio, mgmt, soc, ben, geo, poly.

## Book assistant (chat)
A floating "Ask about our books" button opens the assistant on every page.
- **With Gemini (recommended):** Netlify → Project configuration → Environment variables →
  add `GEMINI_API_KEY` (scope: Functions) → redeploy. Optional: `GEMINI_MODEL` (default `gemini-3.5-flash-lite`).
  The key stays on the server (`netlify/functions/ask.mjs`, endpoint `/api/ask`); it is never sent to the browser.
- The assistant answers only from the publication matrix and the publisher's facts, links every title it
  mentions to its book page, replies in English, Bengali or Hindi, and is rate-limited to 12 questions a minute per visitor.
- **Without a key** (or if Gemini is slow or down) it still works: it searches the same matrix in the browser and
  answers common questions (ordering, publishing, contact, what's coming soon).
