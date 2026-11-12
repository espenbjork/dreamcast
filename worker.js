/* ----------------------------------------------------------
   Dreamcast — egen CORS-proxy (Cloudflare Worker)

   Henter en URL på serversiden (der CORS ikke gjelder) og sender
   svaret tilbake med Access-Control-Allow-Origin, slik at appen i
   nettleseren kan lese RSS-feeds som ellers blokkeres.

   Bruk:  https://<worker>.workers.dev/?url=<feed-url-encodet>
   Deploy: se README.md ("Egen proxy")
   ---------------------------------------------------------- */

// Hvilke nettsteder som får lov til å bruke proxyen. Hindrer at den blir
// en åpen proxy som hvem som helst kan misbruke. Legg til egne origins her.
const ALLOWED_ORIGINS = [
  "https://espenbjork.github.io",
  "https://espenbjork.no",
  "http://localhost",
  "http://127.0.0.1",
  "null", // file:// (når du åpner dreamcast.html rett fra disk)
];

function originAllowed(origin) {
  if (!origin) return true; // ikke-nettleser (curl) eller same-origin
  return ALLOWED_ORIGINS.some((a) => origin === a || origin.startsWith(a + ":"));
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
};

export default {
  async fetch(request) {
    const origin = request.headers.get("Origin");

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (!originAllowed(origin)) {
      return new Response("Forbidden origin", { status: 403, headers: CORS_HEADERS });
    }

    const target = new URL(request.url).searchParams.get("url");
    if (!target) {
      return new Response("Mangler ?url=<feed-url>", { status: 400, headers: CORS_HEADERS });
    }

    let t;
    try {
      t = new URL(target);
    } catch {
      return new Response("Ugyldig url", { status: 400, headers: CORS_HEADERS });
    }
    if (t.protocol !== "https:" && t.protocol !== "http:") {
      return new Response("Kun http(s) er tillatt", { status: 400, headers: CORS_HEADERS });
    }

    try {
      const upstream = await fetch(target, {
        redirect: "follow",
        headers: {
          // Noen feeds avviser requests uten en vanlig User-Agent.
          "User-Agent": "Dreamcast/1.0 (+https://espenbjork.github.io/dreamcast)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
      });
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": upstream.headers.get("Content-Type") || "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=600", // cache feeds i 10 min på Cloudflares kant
        },
      });
    } catch (e) {
      return new Response("Henting feilet: " + e.message, { status: 502, headers: CORS_HEADERS });
    }
  },
};
