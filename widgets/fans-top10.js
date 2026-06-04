/**
 * FANS Top 10 — scrapt die Top-10-Listen von serienfans.org & filmfans.org,
 * matcht jeden Titel präzise gegen TMDB (IMDB-ID → exakter find, sonst Titel+Jahr)
 * und liefert TMDB-VideoItems. Ohne TMDB-Treffer: type:"url"-Item mit FANS-Daten,
 * dessen Detailseite via loadDetail nachgeladen wird.
 *
 * Caching (zwei Ebenen über Widget.storage):
 *  - Listen-Cache (TTL 6h): ganze 10er-Liste → beim App-Start sofort da,
 *    keine leeren Kacheln; "last-good"-Fallback, falls ein Scrape scheitert.
 *  - Slug→TMDB-Auflösung (TTL 7 Tage, Fallbacks 12h): macht das seltene Re-Scrape
 *    billig — nur die 1 Listenseite wird geholt, bekannte Titel überspringen
 *    Detailseite + TMDB-Call.
 * Zusätzlich cacht die App das Modul-Ergebnis selbst über cacheDuration (2h).
 */
WidgetMetadata = {
  id: "forward.fanstop10",
  icon: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAEE0lEQVR42u3UUQ2AMBAFwarjF/8C0AGpi6M7TcbANW/X+tm7r+eFqZZn3CASBg+CYPggBEYPxRj4TAiGwOdBNAQ+DIIR8EkQDYGPgWgEfAgEI+ATIBoCh4doBBwcohFwaIhGwIEhHAHHhWgAHBaiEXBQiEbAISEcAUeEaAAcEKIRcDgIR8DRIBoAB4NwBBwLogFwKAhHwJFAAIBaABwIwhFwHIgGwGEgHAFHAQEABADIBMBBIBwBxwABAAQAEABAAAABAAQAEADgjAA4BIQj4AggAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAIAAAAIACAAgAGPt5w4IQDgAIoAAxAMgBAiAAAgBAiAAIoAA5AMgBAiAAAgBAiAAQoAACIAIIAACIAQIgAAIAQIgACKAAOQDIAQIgAAIAQIgAEKAAAiACCAAAiAECIAACAECIAAigADkAyAECIAACIEAIABCIAAIgAgIAAIgBAKAAAiBACAAQiAACIAICAACIAQCgAAIgQAgACIgAOQDIAQCgAAIgQAgAEIgAAiACAgAAiAEAoAACIEAIAAiIADkAyAEAoAACIEACIAnBAIgAJ4ICIAAeEIgAALgCYEACIAnAgIgAJ4QCIAAeEIgAALgCYEACIAnAgIgAJ4QCIAAeEIgAALgCYEACIDhIwACYPgIgAAYPgIgAMaPAAiA4SMAAmD4CIAAGL4AIADGLwAIgOELAAJg+AKAABi/ACAAhi8ACIDhCwACYPgCgAAYvwAgAIYvAAiA4QsAAmD8AoAAGL4AkAyAPxUAggHwlwJANAD+UQAIBsD/CQDBAPg3ASAaAH8mAAQD4K8EgGAA/JEAEAyAvxEAogHwLwJAMAD+QwAIBsA/CADBALg/AhANgNsjAMEAuDkCEAyAWyMA0QC4MwIQDID7IgDBALgrAhAMgHsiANEAuCUCEAyAGyIAwQC4HQIQDYC7IQDBALgXAhAMgDshAMEAuA8CEA2A2yAAwQC4CQIQDIBbIADRALgDAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIACAAgAAAAgAIAAgAIACAAAACAAgAIACAAAACAAgAIACAAAACAAgAIACAAAATA7CfQ0B0/AIAAuAgIACAAAACAAgAIACAAABnBUAEIDx+AQABcBgQACAXABGA8PgFAOIBEAEIj18AQAAcCqoBEAEIj18AIB4AEYDw+AUA4gEQAQiPXwQgPn4BgHgARADC4xcBiI9fBCA+fgGAeABEAMLjFwGIj18EID5+EYD4+IUA4sMXATB+EYD6+IUA4sMXATB+IYD68IUADF8MwOiFAAxfEMDgRQLjnvE+Xn8KfzwNd3AAAAAASUVORK5CYII=",
  title: "FANS Top 10",
  description: "Top 10 Serien & Filme von serienfans.org / filmfans.org, gegen TMDB aufgelöst",
  author: "NoWillow",
  site: "https://serienfans.org/top10",
  version: "1.4.0",
  requiredVersion: "0.0.1",
  detailCacheDuration: 3600,
  modules: [
    {
      id: "loadTop10",
      title: "FANS Top 10",
      functionName: "loadTop10",
      cacheDuration: 7200,
      params: [
        {
          name: "kind",
          title: "Typ",
          type: "enumeration", // Umschalter Serien / Filme / Beide
          value: "tv",
          enumOptions: [
            { title: "Serien", value: "tv" },
            { title: "Filme", value: "movie" },
            { title: "Beide", value: "both" },
          ],
        },
      ],
    },
  ],
};

const FANS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const SERIES = { url: "https://serienfans.org/top10", host: "https://serienfans.org", kind: "tv" };
const MOVIES = { url: "https://filmfans.org/top10", host: "https://filmfans.org", kind: "movie" };

const CACHE_TTL_MS = 6 * 3600 * 1000; // 6h: Listen-Cache (Sofortanzeige beim Start)
const MAP_TTL_MS = 7 * 24 * 3600 * 1000; // 7 Tage: gemerkte Slug→TMDB-Auflösung
const FALLBACK_TTL_MS = 12 * 3600 * 1000; // 12h: url-Fallbacks öfter neu versuchen
const MAP_MAX = 80; // Obergrenze gecachter Auflösungen

async function loadTop10(params = {}) {
  const sel = params.kind === "movie" ? "movie" : params.kind === "both" ? "both" : "tv";
  if (sel === "both") {
    // Serien + Filme parallel (nutzt beide Caches), dann im Reißverschluss mischen
    const [series, movies] = await Promise.all([loadKindCached("tv"), loadKindCached("movie")]);
    return interleave(series, movies);
  }
  return await loadKindCached(sel);
}

async function loadKindCached(kind) {
  const key = "fanstop10:" + kind;
  const now = Date.now();

  let cached = null;
  try {
    cached = Widget.storage.get(key); // { ts, items }
  } catch (e) {
    console.error("[loadKindCached] storage.get fehlgeschlagen:", e && (e.message || e));
  }

  // 1) Cache frisch genug → sofort zurück, kein Scrape (keine leeren Kacheln)
  if (cached && cached.items && cached.items.length && now - cached.ts < CACHE_TTL_MS) {
    return cached.items;
  }

  // 2) stale/leer → scrapen und Cache aktualisieren
  try {
    const items = await buildTop10(kind);
    if (items && items.length) {
      try {
        Widget.storage.set(key, { ts: now, items });
      } catch (e) {
        console.error("[loadKindCached] storage.set fehlgeschlagen:", e && (e.message || e));
      }
      return items;
    }
    // leeres Ergebnis → notfalls letzter guter Stand
    return (cached && cached.items) || items;
  } catch (e) {
    console.error("[loadKindCached] Scrape fehlgeschlagen:", e && (e.message || e));
    if (cached && cached.items && cached.items.length) return cached.items; // NIE leer
    throw e;
  }
}

// Reißverschluss-Mix: Serie1, Film1, Serie2, Film2, …
function interleave(a, b) {
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

async function buildTop10(kind) {
  const src = kind === "movie" ? MOVIES : SERIES;
  const entries = await scrapeTop10(src.url, src.host); // nur 1 HTTP-Call

  const mapKey = "fanstop10:map:" + kind;
  let map = {};
  try {
    map = Widget.storage.get(mapKey) || {};
  } catch (e) {}
  const now = Date.now();
  let changed = false;

  // Pro Eintrag parallel auflösen → Reihenfolge (Rang 1..10) bleibt erhalten.
  const items = await Promise.all(
    entries.map(async (entry) => {
      const known = map[entry.slug];
      const ttl = known && known.item && known.item.type === "url" ? FALLBACK_TTL_MS : MAP_TTL_MS;
      if (known && known.item && now - known.ts < ttl) {
        return known.item; // bekannter Titel → KEIN Detail-Fetch, KEIN TMDB-Call
      }
      const item = await resolveEntry(entry, src);
      map[entry.slug] = { ts: now, item };
      changed = true;
      return item;
    })
  );

  if (changed) {
    try {
      Widget.storage.set(mapKey, pruneMap(map, now));
    } catch (e) {
      console.error("[buildTop10] map-Persistenz fehlgeschlagen:", e && (e.message || e));
    }
  }
  return items;
}

function pruneMap(map, now) {
  const slugs = Object.keys(map).filter((s) => map[s] && now - map[s].ts < MAP_TTL_MS);
  slugs.sort((a, b) => map[b].ts - map[a].ts); // neueste zuerst
  const keep = {};
  slugs.slice(0, MAP_MAX).forEach((s) => (keep[s] = map[s]));
  return keep;
}

// ---- HTTP-Helfer ----
async function fansGet(url) {
  const host = (url.match(/^https?:\/\/[^/]+/) || [""])[0];
  return await Widget.http.get(url, {
    headers: { "User-Agent": FANS_UA, Referer: host + "/", "Accept-Language": "de-DE,de;q=0.9" },
  });
}

// ---- 1) Top-10-Liste scrapen ----
async function scrapeTop10(url, host) {
  const res = await fansGet(url);
  const $ = Widget.html.load(res.data);
  const out = [];
  $(".tops ul.rate li").each((_, li) => {
    const el = $(li);
    const rank = parseInt(el.find(".time span").first().text().trim(), 10) || out.length + 1;
    const slug = el.children("a").first().attr("href") || "";
    const title = el.find("h4").first().text().trim();
    const style = el.find(".screener > div").first().attr("style") || "";
    const m = style.match(/url\(([^)]+)\)/);
    const poster = m ? absUrl(m[1], host) : "";
    const genreItems = [];
    el.find(".tags a").each((__, a) => {
      const gid = ($(a).attr("href") || "").match(/\/genre\/(\d+)/);
      if (gid) genreItems.push({ id: gid[1], title: $(a).text().trim() });
    });
    const description = el.find("p.description").text().trim();
    if (title) out.push({ rank, slug, title, poster, genreItems, description, host });
  });
  return out;
}

// ---- 2) Detailseite scrapen (Jahr/IMDB für Matching + Daten für loadDetail) ----
async function fetchDetail(detailUrl) {
  const host = (detailUrl.match(/^https?:\/\/[^/]+/) || [""])[0];
  const res = await fansGet(detailUrl);
  const html = res.data;
  const $ = Widget.html.load(html);

  const h2 = $(".content.splitview h2").first();
  const h2text = h2.text().trim(); // "From (2022)"
  const year = (h2text.match(/(19|20)\d{2}/) || [])[0] || "";
  const title = h2text.replace(/\(\s*(19|20)\d{2}\s*\)\s*$/, "").trim();

  const imdbHref = $('a[href*="imdb.com/title/"]').first().attr("href") || "";
  const imdbId = (imdbHref.match(/tt\d+/) || [])[0] || "";

  const description = $(".content.splitview p.description").first().text().trim() || $("p.description").first().text().trim();

  const genreItems = [];
  $(".content.splitview .tags a").each((_, a) => {
    const gid = ($(a).attr("href") || "").match(/\/genre\/(\d+)/);
    if (gid) genreItems.push({ id: gid[1], title: $(a).text().trim() });
  });

  // Bilder direkt aus dem HTML: Backdrop 1280x720, Poster 200x300
  const bd = html.match(/\/media\/[0-9]+\/1280\/720/);
  const ps = html.match(/\/media\/[0-9]+\/200\/300/);
  const backdropPath = bd ? host + bd[0] : "";
  const posterPath = ps ? host + ps[0] : "";

  return { title, year, imdbId, description, genreItems, backdropPath, posterPath, host };
}

// ---- 3) Eintrag gegen TMDB auflösen ----
async function resolveEntry(entry, src) {
  const detailUrl = src.host + entry.slug;
  let detail = null;
  try {
    detail = await fetchDetail(detailUrl);
  } catch (e) {
    console.error("[detail] fehlgeschlagen:", detailUrl, e && (e.message || e));
  }

  // a) Exakt über IMDB-ID (bestes Matching)
  if (detail && detail.imdbId) {
    const hit = await tmdbFindByImdb(detail.imdbId, src.kind);
    if (hit) return toTmdbItem(hit, src.kind);
  }
  // b) Titel + Jahr
  const year = (detail && detail.year) || "";
  const hit2 = await tmdbSearch(entry.title, year, src.kind);
  if (hit2) return toTmdbItem(hit2, src.kind);

  // c) Fallback: FANS-Daten, Detailseite per loadDetail nachladbar
  return toUrlFallback(entry, detail, detailUrl, src.kind);
}

async function tmdbFindByImdb(imdbId, kind) {
  try {
    const res = await Widget.tmdb.get("find/" + imdbId, {
      params: { external_source: "imdb_id", language: "de-DE" },
    });
    const arr = kind === "tv" ? res && res.tv_results : res && res.movie_results;
    return (arr && arr[0]) || null;
  } catch (e) {
    console.error("[tmdb] find fehlgeschlagen:", imdbId, e && (e.message || e));
    return null;
  }
}

async function tmdbSearch(title, year, kind) {
  // Erst voller Titel, dann (Fallback) ohne Untertitel nach " - " / " – " / ": "
  const queries = [title];
  const trimmed = title.split(/\s[-–:]\s/)[0].trim();
  if (trimmed && trimmed !== title) queries.push(trimmed);

  for (let i = 0; i < queries.length; i++) {
    const params = { query: queries[i], language: "de-DE", include_adult: false };
    if (year) {
      if (kind === "tv") params.first_air_date_year = year;
      else params.primary_release_year = year;
    }
    try {
      const res = await Widget.tmdb.get("search/" + kind, { params });
      const r = res && res.results && res.results[0];
      if (r) return r;
    } catch (e) {
      console.error("[tmdb] search fehlgeschlagen:", queries[i], e && (e.message || e));
    }
  }
  return null;
}

// ---- VideoItem-Bau ----
function toTmdbItem(r, kind) {
  return {
    id: r.id,
    type: "tmdb",
    mediaType: kind === "tv" ? "tv" : "movie",
    title: r.name || r.title,
    posterPath: r.poster_path, // RAW-Pfad, App baut volle URL
    backdropPath: r.backdrop_path,
    rating: r.vote_average,
    releaseDate: r.first_air_date || r.release_date,
    description: r.overview,
  };
}

function toUrlFallback(entry, detail, detailUrl, kind) {
  const genreItems = detail && detail.genreItems && detail.genreItems.length ? detail.genreItems : entry.genreItems;
  return {
    id: detailUrl,
    type: "url",
    mediaType: kind === "tv" ? "tv" : "movie",
    title: (detail && detail.title) || entry.title,
    posterPath: (detail && detail.posterPath) || entry.poster,
    backdropPath: (detail && detail.backdropPath) || entry.poster,
    description: (detail && detail.description) || entry.description,
    genreItems,
    releaseDate: detail && detail.year ? detail.year + "-01-01" : undefined,
    link: detailUrl, // → loadDetail beim Antippen
  };
}

// ---- 4) Detailseite für url-Fallbacks (top-level, bekommt den link-String) ----
async function loadDetail(link) {
  try {
    const d = await fetchDetail(link);
    const kind = link.indexOf("serienfans") >= 0 ? "tv" : "movie";
    return {
      id: link,
      type: "url",
      mediaType: kind,
      link,
      title: d.title,
      posterPath: d.posterPath,
      backdropPath: d.backdropPath,
      backdropPaths: d.backdropPath ? [d.backdropPath] : undefined,
      description: d.description,
      genreItems: d.genreItems,
      releaseDate: d.year ? d.year + "-01-01" : undefined,
    };
  } catch (e) {
    console.error("[loadDetail] fehlgeschlagen:", link, e && (e.message || e));
    return null;
  }
}

// ---- utils ----
function absUrl(u, host) {
  return u.indexOf("http") === 0 ? u : host + u;
}
