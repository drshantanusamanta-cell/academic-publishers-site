// Book assistant — Netlify Function (v2) calling Google Gemini.
// Endpoint: /api/ask   POST {"messages":[{"role":"user"|"model","text":"..."}]}
// Returns  {"reply":"..."}  — book ids appear in the reply as [[book-id]] and the page turns them into links.
//
// Credentials:
//   • By default Netlify AI Gateway injects GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL (billed to Netlify credits).
//   • To use your own Google key instead, set GEMINI_API_KEY in Netlify → Environment variables (scope: Functions);
//     Netlify then stops injecting and the SDK calls Google directly.
//   • Optional: GEMINI_MODEL (default gemini-3.5-flash-lite).
// The key never reaches the browser.
import { GoogleGenAI } from "@google/genai";
import { MATRIX, COUNT } from "../lib/catalogue.mjs";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const TIMEOUT_MS = 22000;          // Netlify functions stop at ~26 s
const MAX_TURNS = 10;              // conversation turns sent to the model
const MAX_CHARS = 600;             // per user message
const RATE = { windowMs: 60000, max: 12 };   // per visitor IP, per function instance
const hits = new Map();

const SYSTEM = `You are the book assistant on the website of Academic Publishers, Kolkata (founded 1958).
You help students, teachers, librarians and authors find our books and use our services.

RULES
- Answer only from the PUBLICATION MATRIX and the PUBLISHER FACTS below. Never invent a title, author, edition, ISBN, price or date.
- Whenever you mention one of our books, write its id in double square brackets right after the title, e.g. "QUEST: A Comprehensive Guide to UG Medicine [[quest-ug-medicine]]". The website turns these into links. Only use ids that exist in the matrix.
- If a price or ISBN shows "-", say it is not listed online and suggest the price list on the Download Catalogue page or calling the office.
- "forthcoming" titles are not out yet; say so and suggest emailing to be notified.
- If we have nothing that fits, say so plainly and suggest the closest subject we do publish, or contacting the office.
- Questions not about our books, publishing with us, ordering or the publisher: politely say you can only help with Academic Publishers' books and services.
- Do not give medical, legal or exam-result advice; for study questions you may recommend suitable books from the matrix.
- Reply in the visitor's language (English, Bengali or Hindi). Keep answers short and scannable: a one-line answer, then at most 6 bullet points. Use **bold** sparingly. No tables, no headings.

PUBLISHER FACTS
- Address: 5A Bhawani Dutta Lane, Kolkata 700073, West Bengal, India. Phone +91-33-2257-1071. Email contact@academicpublishers.in. Open Monday to Friday, 10 AM to 6 PM.
- Subjects: Medical Science; Mathematics and Statistics (Algebra, Analysis, Statics and Dynamics, Geometry, Probability and Statistics, Linear Programming, Competitive Mathematics, Numerical Analysis, Calculus); Higher Secondary and JEE; Physics and Chemistry; Computer Science; Biological Science; Management and Economics; Social Science; Bengali; Geography; Polytechnic.
- Publish with us: send a proposal through the Book Proposal Form (page #proposal). Editorial committees of subject experts review it; competitive royalties; in-house editing, typesetting, printing and binding; nationwide promotion through distributors and booksellers.
- Custom publishing (#custom): self-publishing support, DTP and typesetting in English, Bengali and Hindi, printing of journals, magazines and annual reports, sales through our network.
- Buying (#buy): order online on the publisher's store, order directly by phone or email (good for colleges and libraries), or buy from booksellers across India. Teachers can request a review copy by email.
- Catalogues (#catalogue): Bengali catalogue (Dec 2012), Mathematics and Medical catalogues (2015–16), English and Bengali price lists (2015–16). For current prices, call or email the office.
- Partners: co-publishing with WHO, FAO and ILO; member of Google's Book Partner Program.

PUBLICATION MATRIX (${COUNT} titles; columns separated by |)
${MATRIX}`;

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (req, context) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  if (!process.env.GEMINI_API_KEY) return json({ error: "not-configured" }, 503);

  // light rate limit
  const ip = (context && context.ip) || req.headers.get("x-nf-client-connection-ip") || "anon";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) return json({ error: "Too many questions in a short time. Please wait a minute." }, 429);
  recent.push(now); hits.set(ip, recent);

  let body = {};
  try { body = await req.json(); } catch (e) { return json({ error: "Bad request." }, 400); }
  const msgs = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const contents = msgs
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.text.trim().slice(0, m.role === "model" ? 4000 : MAX_CHARS) }],
    }));
  if (!contents.length || contents[contents.length - 1].role !== "user") return json({ error: "Please type a question." }, 400);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const ai = new GoogleGenAI({}); // reads GEMINI_API_KEY and GOOGLE_GEMINI_BASE_URL
    const result = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM, temperature: 0.3, maxOutputTokens: 700, abortSignal: ctrl.signal },
    });
    const reply = (result.text || "").trim();
    if (!reply) return json({ error: "upstream" }, 502);
    return json({ reply });
  } catch (e) {
    const timedOut = ctrl.signal.aborted || (e && e.name === "AbortError");
    console.error("ask failed", timedOut ? "timeout" : String(e).slice(0, 500));
    return json({ error: timedOut ? "timeout" : "upstream" }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
};

export const config = { path: "/api/ask" };
