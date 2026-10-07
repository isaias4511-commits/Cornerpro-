/**
 * CornerPro — proxy serverless para a API-Football (Cloudflare Worker)  ·  v2
 * =============================================================================
 * O QUE ELE FAZ
 *   · Guarda a chave da API em um secret — o navegador nunca a vê.
 *   · Agrega, estima e cacheia NO SERVIDOR, economizando sua cota diária.
 *   · Não é um encaminhador aberto: só responde rotas conhecidas.
 *
 * ROTAS
 *   GET /health                      diagnóstico (não chama a API, não expõe chave)
 *   GET /derive/board?days=1         jogos ao vivo + N dias, já normalizados,
 *                                    com escanteios estimados e ranking pronto
 *   GET /derive/match?id=123         um jogo: placar, eventos reais e
 *                                    estatísticas reais (quando o plano permite)
 *   GET /derive/h2h?home=33&away=34  confronto direto real, em cache por 6h
 *   GET /fixtures | /fixtures/statistics | /leagues | /status   (repasse direto)
 *
 * ECONOMIA DE COTA (plano Free = 100 requisições/dia)
 *   · /derive/board  → 4 chamadas upstream por janela de cache (30s),
 *                      compartilhadas entre TODOS os usuários do app.
 *   · /derive/h2h    → 1 chamada a cada 6 horas por confronto.
 *   · /derive/match  → 2 chamadas só quando alguém abre um jogo, cache 20s.
 *   O app deixa de fazer 6 requisições por cliente a cada atualização.
 *
 * COMO PUBLICAR (uma vez, ~3 minutos)
 *   1) npm install -g wrangler
 *   2) wrangler login
 *   3) wrangler secret put APIFOOTBALL_KEY   # cole a chave (NÃO escreva no código)
 *   4) wrangler secret put ALLOWED_ORIGINS   # ex.: https://meuapp.com,http://localhost:8000
 *   5) wrangler deploy                       # anote a URL https://....workers.dev
 *   6) No app: ⚙️ Fonte de dados → cole a URL → Testar proxy → Salvar
 *   Teste: curl https://SEU-WORKER.workers.dev/health
 *
 * SEGURANÇA
 *   · Chave lida só de env.APIFOOTBALL_KEY (secret) — nunca do cliente.
 *   · Lista branca de rotas; nada fora dela é encaminhado.
 *   · CORS restrito a ALLOWED_ORIGINS (use "*" só para testar).
 *   · Limite de requisições por IP (RATE_LIMIT_PER_MIN, padrão 60).
 *   · Cache e falhas de cache são tratados: se o cache cair, o proxy continua.
 *   · A chave não aparece em resposta, cabeçalho ou log.
 * =============================================================================
 */

const UPSTREAM = 'https://v3.football.api-sports.io';
const TZ_OFFSET = -3; // exibição em horário de Brasília

/* Repasse direto permitido */
const PASSTHROUGH = [
  /^\/fixtures$/,
  /^\/fixtures\/statistics$/,
  /^\/leagues$/,
  /^\/status$/
];

const TTL = { live: 15, date: 300, stats: 20, board: 30, match: 20, h2h: 21600, teamavg: 21600, league: 86400, default: 60 };
/* Mínimo de partidas com escanteios REAIS observados para uma liga poder
   servir de referência. Abaixo disso a média não é usada: o campo fica em
   branco, em vez de receber um número inventado. */
const MIN_LEAGUE_SAMPLES = 8;
/* Corte efetivo: ?min=N (1-50) sobrescreve o padrão de 8. O cliente manda o
   mesmo valor, então os dois lados usam exatamente o mesmo limite. */
function cacheKeyFor(pathname, search, min, origin) {
  const q = new URLSearchParams(search || '');
  q.delete('min');
  const qs = q.toString();
  return 'https://proxy.internal' + pathname + (qs ? '?' + qs : '') + '#m=' + min + '&o=' + origin;
}
function minFrom(sp) {
  const v = parseInt(sp && sp.get ? sp.get('min') : null, 10);
  return (isFinite(v) && v >= 1) ? Math.min(50, v) : MIN_LEAGUE_SAMPLES;
}
const LEAGUE_KEY = 'https://proxy.internal/_leagueavg_v1';
const RATE_DEFAULT = 60;
const MAX_H2H = 40;
const SERIES_TEAMS = 15; // quantos times ganham série temporal (mantém a resposta leve)

const buckets = new Map();

/* ------------------------------- utilidades ------------------------------- */

function dayOffset(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rngOf(s) {
  let a = s >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function abbrOf(name) {
  const n = String(name || '?').trim();
  const words = n.split(/[\s.]+/).filter(Boolean);
  const c = (words[0] && words[0].length >= 3) ? words[0].slice(0, 3) : n.replace(/[^\w]/g, '').slice(0, 3);
  return (c || '?').toUpperCase();
}
function localTime(iso) {
  const t = Date.parse(iso);
  if (isNaN(t)) return '20:00';
  return new Date(t + TZ_OFFSET * 3600000).toISOString().slice(11, 16);
}
function normTeam(t) {
  t = t || {};
  return { id: t.id || null, name: t.name || '?', abbr: abbrOf(t.name), badge: t.logo || null };
}

const LIVE_SHORT = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'];const DONE_SHORT = ['FT', 'AET', 'PEN'];
const EV_ICON = {
  'Goal': '⚽', 'Normal Goal': '⚽', 'Own Goal': '⚽', 'Penalty': '⚽', 'Missed Penalty': '❌',
  'Yellow Card': '🟨', 'Second Yellow card': '🟥', 'Red Card': '🟥',
  'Substitution': '🔁', 'subst': '🔁', 'Var': '📺'
};
function evIcon(type, detail) { return EV_ICON[detail] || EV_ICON[type] || '•'; }

/* --------------------------------------------------------------------------
   Médias de escanteios por liga — construídas SÓ de observações reais.
   Cada resposta de /fixtures/statistics que traz "Corner Kicks" de verdade
   soma uma observação à liga correspondente. O acumulado vive no cache do
   Worker por 24h, então a amostra cresce entre execuções e é compartilhada
   por todos os usuários. Nenhum valor fixo é usado como média.
   -------------------------------------------------------------------------- */
async function readLeagueCache() {
  try {
    const c = caches.default;
    if (!c) return {};
    const hit = await c.match(LEAGUE_KEY);
    if (!hit) return {};
    const j = await hit.json();
    return (j && j.leagues) ? j.leagues : {};
  } catch (e) { return {}; }
}
function writeLeagueCache(ctx, leagues) {
  try {
    const c = caches.default;
    if (!c || !ctx || !ctx.waitUntil) return;
    const body = JSON.stringify({ updated: Date.now(), leagues });
    ctx.waitUntil(c.put(LEAGUE_KEY, new Response(body, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'max-age=' + TTL.league }
    })));
  } catch (e) { /* cache é opcional */ }
}
async function recordObservations(ctx, obs) {
  const leagues = await readLeagueCache();
  (obs || []).forEach((o) => {
    if (!o || o.n <= 0 || o.total == null || !isFinite(o.total)) return;
    const k = o.leagueId ? String(o.leagueId) : ('n:' + String(o.leagueName || ''));
    if (!k || k === 'n:') return;
    const e = leagues[k] || (leagues[k] = { name: o.leagueName || '', n: 0, corners: 0, updated: 0 });
    e.n += o.n; e.corners += o.total;
    if (o.leagueName) e.name = o.leagueName;
    e.updated = Date.now();
  });
  writeLeagueCache(ctx, leagues);
  return leagues;
}
/* Mapa pronto para uso: { id: { name, n, perMatch } } */
async function leagueMap(ctx, min) {
  const cur = await readLeagueCache();
  const out = {};
  const MINN = min || MIN_LEAGUE_SAMPLES;
  Object.keys(cur).forEach((k) => {
    const e = cur[k];
    if (!e || !e.n) return;
    out[k] = { id: k, name: e.name || '', n: e.n, perMatch: Math.round((e.corners / e.n) * 10) / 10,
      min: MINN, usable: e.n >= MINN, need: e.n >= MINN ? 0 : (MINN - e.n), updated: e.updated || 0 };
  });
  return out;
}

/* Estimativa de métricas por jogo — determinística por jogo+minuto (sem "pular"). */
function estimate(fx, lg) {
  const id = String(fx.fixture.id);
  const st = fx.fixture.status || {};
  const live = LIVE_SHORT.includes(st.short);
  const played = live ? Math.max(1, st.elapsed || 1) : (DONE_SHORT.includes(st.short) ? 90 : 0);
  // A referência vem da média REAL da liga (n observações). Sem amostra
  // suficiente, não há número: corners fica null e a interface mostra "—".
  const known = !!(lg && lg.usable && lg.perMatch > 0);
  const base = known ? lg.perMatch : 9.5;
  const r = rngOf(seedOf(id + '|' + Math.floor(played / 5)));
  const th = Math.max(1.1, base / 2 + (r() - 0.5) * 3);
  const ta = Math.max(1.1, base / 2 + (r() - 0.5) * 3);
  const per = played / 90;
  const ch = Math.max(0, Math.round(th * per * (0.85 + r() * 0.3)));
  const ca = Math.max(0, Math.round(ta * per * (0.85 + r() * 0.3)));
  const split = (n) => { const o = [0, 0, 0, 0]; for (let i = 0; i < n; i++) o[Math.min(3, Math.floor(r() * 4))]++; return o; };
  const possH = Math.round(th / (th + ta) * 100);
  return {
    possession: [possH, 100 - possH],
    shots: [Math.round(th * (0.5 + r() * 0.45) * per), Math.round(ta * (0.5 + r() * 0.45) * per)],
    sot: [Math.round(ch * (0.35 + r() * 0.3)), Math.round(ca * (0.35 + r() * 0.3))],
    corners: known ? [ch, ca] : null,
    cards: [played > 0 ? Math.round(r() * Math.max(1, 4 * per)) : 0, played > 0 ? Math.round(r() * Math.max(1, 4 * per)) : 0],
    fouls: [played > 0 ? Math.round(2 + r() * Math.max(1, 18 * per)) : 0, played > 0 ? Math.round(2 + r() * Math.max(1, 18 * per)) : 0],
    cornersPeriod: known ? { home: split(ch), away: split(ca) } : null,
    cornersSource: known ? 'league' : 'none',
    leagueN: known ? lg.n : 0,
    leaguePerMatch: known ? lg.perMatch : null,
    real: false
  };
}

function normMatch(fx, lg) {
  const st = (fx.fixture && fx.fixture.status) || {};
  const short = st.short || 'NS';
  const live = LIVE_SHORT.includes(short);
  const done = DONE_SHORT.includes(short);
  const m = {
    id: 'a' + fx.fixture.id,
    league: 'A' + ((fx.league && fx.league.id) || 'x'),
    leagueName: (fx.league && fx.league.name) || 'Liga',
    flag: (fx.league && fx.league.flag) || '🌍',
    country: (fx.league && fx.league.country) || '',
    home: normTeam(fx.teams && fx.teams.home),
    away: normTeam(fx.teams && fx.teams.away),
    status: live ? 'live' : (done ? 'finished' : 'scheduled'),
    statusShort: short,
    minute: live ? (st.elapsed || 1) : (done ? 90 : 0),
    time: fx.fixture.date ? localTime(fx.fixture.date) : '20:00',
    date: fx.fixture.date ? String(fx.fixture.date).slice(0, 10) : dayOffset(0),
    score: [(fx.goals && fx.goals.home) || 0, (fx.goals && fx.goals.away) || 0],
    venue: (fx.fixture.venue && fx.fixture.venue.name) || '',
    round: (fx.league && fx.league.round) || '',
    est: true
  };
  m.stats = estimate(fx, lg);
  return m;
}

/* --------------------------- chamadas ao upstream -------------------------- */

function quotaOf(res) {
  try {
    const rem = res.headers.get('x-ratelimit-requests-remaining');
    const lim = res.headers.get('x-ratelimit-requests-limit');
    return rem ? { remaining: Number(rem), limit: lim ? Number(lim) : null } : null;
  } catch (e) { return null; }
}

async function upstream(pathAndQuery, key) {
  const res = await fetch(UPSTREAM + pathAndQuery, {
    headers: { 'x-apisports-key': key, 'Accept': 'application/json' }
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (e) { json = null; }
  return { ok: res.ok, status: res.status, json, text, quota: quotaOf(res) };
}

function upstreamError(v) {
  if (!v) return 'sem resposta';
  if (v.json && v.json.errors && Object.keys(v.json.errors).length) return JSON.stringify(v.json.errors);
  return 'HTTP ' + v.status;
}

/* ------------------------------ derivações -------------------------------- */

const STAT_MAP = {
  'Ball Possession': 'possession',
  'Total Shots': 'shots',
  'Shots on Goal': 'sot',
  'Corner Kicks': 'corners',
  'Yellow Cards': 'cards',
  'Fouls': 'fouls'
};

function mapStats(arr) {
  const num = (v) => { const n = parseInt(String(v == null ? '' : v).replace('%', ''), 10); return isNaN(n) ? 0 : n; };
  const out = {};
  let found = 0;
  Object.keys(STAT_MAP).forEach((label) => {
    const row = (arr || []).find((x) => x && x.type === label);
    if (row && row.statistics) {
      out[STAT_MAP[label]] = [num(row.statistics.home), num(row.statistics.away)];
      found++;
    }
  });
  return found ? out : null;
}

async function buildBoard(env, key, days, ctx, min) {
  const paths = ['/fixtures?live=all'];
  for (let d = -1; d <= days; d++) {
    paths.push('/fixtures?date=' + dayOffset(d) + '&timezone=America/Sao_Paulo');
  }
  const settled = await Promise.allSettled(paths.map((p) => upstream(p, key)));
  const good = settled.filter((r) => r.status === 'fulfilled' && r.value && r.value.ok &&
    r.value.json && Array.isArray(r.value.json.response));

  if (!good.length) {
    const any = settled.find((r) => r.status === 'fulfilled');
    return { error: 'Falha ao consultar a API-Football', detail: upstreamError(any && any.value), status: 502 };
  }

  const byId = new Map();
  good.forEach((r) => r.value.json.response.forEach((fx) => {
    if (!fx || !fx.fixture) return;
    const prev = byId.get(fx.fixture.id);
    const prevMin = prev && prev.fixture.status ? (prev.fixture.status.elapsed || 0) : -1;
    const nowMin = fx.fixture.status ? (fx.fixture.status.elapsed || 0) : 0;
    if (!prev || nowMin >= prevMin) byId.set(fx.fixture.id, fx);
  }));

  const lgm = await leagueMap(ctx, min);
  const matches = Array.from(byId.values()).map((fx) => normMatch(fx, lgm[String((fx.league && fx.league.id) || '')] || null));
  const order = { live: 0, scheduled: 1, finished: 2 };
  matches.sort((a, b) => (order[a.status] - order[b.status]) || (a.date + a.time).localeCompare(b.date + b.time));

  const ranking = matches
    .map((m) => ({
      id: m.id, label: m.home.name + ' × ' + m.away.name, league: m.leagueName,
      corners: m.stats.corners ? m.stats.corners[0] + m.stats.corners[1] : null, live: m.status === 'live'
    }))
    .sort((a, b) => ((b.corners || -1) - (a.corners || -1)))
    .slice(0, 12);

  const quota = good.map((r) => r.value.quota).find(Boolean) || null;

  return {
    payload: {
      generated: Date.now(),
      days,
      count: matches.length,
      live: matches.filter((m) => m.status === 'live').length,
      totalCorners: matches.reduce((s, m) => s + (m.stats.corners ? m.stats.corners[0] + m.stats.corners[1] : 0), 0),
      cornersAvailable: matches.filter((m) => m.stats.corners).length,
      minLeagueSamples: min,
      leagueAverages: lgm,
      estimated: true,
      matches,
      ranking,
      quota
    }
  };
}

async function buildMatch(key, id, ctx, min) {
  const [fxS, stS] = await Promise.allSettled([
    upstream('/fixtures?id=' + encodeURIComponent(id), key),
    upstream('/fixtures/statistics?fixture=' + encodeURIComponent(id), key)
  ]);

  const fxV = fxS.status === 'fulfilled' ? fxS.value : null;
  const stV = stS.status === 'fulfilled' ? stS.value : null;
  const fx = (fxV && fxV.ok && fxV.json && fxV.json.response && fxV.json.response[0]) || null;

  const out = { id: Number(id), stats: null, statsReal: false, statsNote: '', events: [], quota: null };

  const lgId = (fx && fx.league) ? String(fx.league.id) : '';
  const lgName = (fx && fx.league) ? (fx.league.name || '') : '';
  const lgm = await leagueMap(ctx, min);
  const myLg = lgm[lgId] || null;

  if (fx) {
    const m = normMatch(fx, myLg);
    out.status = m.status;
    out.minute = m.minute;
    out.score = m.score;
    out.statusShort = m.statusShort;
    out.venue = m.venue;
    out.round = m.round;
    out.est = m.stats;
    out.events = (fx.events || []).map((e) => ({
      min: (e.time && e.time.elapsed) || 0,
      ic: evIcon(e.type, e.detail),
      tx: e.detail || e.type || 'Evento',
      side: (e.team && m.away.id === e.team.id) ? 'away' : 'home'
    })).sort((a, b) => a.min - b.min);
  } else {
    out.statsNote = 'A API não devolveu a partida (' + upstreamError(fxV) + ').';
  }

  if (stV && stV.ok && stV.json && stV.json.response && stV.json.response[0]) {
    const stats = mapStats(stV.json.response[0].statistics);
    if (stats) {
      out.stats = stats; out.statsReal = true;
      // observação REAL de escanteios → alimenta a média da liga
      if (Array.isArray(stats.corners)) {
        const total = stats.corners[0] + stats.corners[1];
        await recordObservations(ctx, [{ leagueId: lgId, leagueName: lgName, total: total, n: 1 }]);
        const fresh = await leagueMap(ctx, min);
        out.leagueAvg = fresh[lgId] || null;
      }
    }
    else if (!out.statsNote) { out.statsNote = 'A API respondeu sem as métricas esperadas — valores estimados.'; }
  } else if (!out.statsNote) {
    out.statsNote = 'Estatísticas indisponíveis no seu plano (' + upstreamError(stV) + ') — escanteios pela média da liga' +
      (myLg ? ' (n=' + myLg.n + ')' : ' (sem amostra ainda)') + '.';
  }

  out.quota = (fxV && fxV.quota) || (stV && stV.quota) || null;
  return { payload: out };
}

async function buildH2H(key, home, away) {
  const hid = Number(home), aid = Number(away);
  if (!hid || !aid) return { error: 'Informe home e away (ids numéricos de time)', status: 400 };

  const v = await upstream('/fixtures?h2h=' + hid + '-' + aid, key);
  if (!v.ok || !v.json || !Array.isArray(v.json.response)) {
    return { error: 'H2H indisponível', detail: upstreamError(v), status: 502 };
  }

  const played = v.json.response
    .filter((f) => f && f.fixture && DONE_SHORT.includes((f.fixture.status || {}).short))
    .sort((a, b) => String(b.fixture.date).localeCompare(String(a.fixture.date)));

  let wHome = 0, draw = 0, wAway = 0;
  played.forEach((f) => {
    const gh = (f.goals && f.goals.home) || 0, ga = (f.goals && f.goals.away) || 0;
    const homeIsH = f.teams.home.id === hid;
    const hg = homeIsH ? gh : ga, ag = homeIsH ? ga : gh;
    if (hg > ag) wHome++; else if (hg < ag) wAway++; else draw++;
  });

  const last = played.slice(0, 6).map((f) => ({
    date: String(f.fixture.date || '').slice(0, 10),
    league: (f.league && f.league.name) || '',
    home: f.teams.home.name, away: f.teams.away.name,
    score: [(f.goals && f.goals.home) || 0, (f.goals && f.goals.away) || 0]
  }));

  return { payload: { meetings: played.length, home: wHome, draw, away: wAway, last, quota: v.quota } };
}


/* Resolve de QUAL liga vem a média de escanteios de um time agregado e
   devolve o registro público do time: `leagues` (onde ele jogou, com jogos
   e jogos com escanteio), `source` (kind/league/country/n) e `sourceKind`.
   A origem nasce aqui, nunca é inferida depois na interface. */
function teamRecord(a, lgm, min) {
  const r1 = (n) => Math.round(n * 10) / 10;

    const lgList = Object.keys(a.lg).map((k) => a.lg[k])
      .sort((x, y) => (y.games - x.games) || (y.cn - x.cn));
    const primary = lgList[0] || null;                       // onde o time mais jogou
    const withC = lgList.filter((x) => x.cn > 0)             // quem de fato forneceu escanteio
      .sort((x, y) => (y.cn - x.cn) || (y.games - x.games));
    const srcLg = withC[0] || primary;
    const lm = (srcLg && srcLg.id) ? lgm[String(srcLg.id)] : null;
    const kind = !withC.length ? 'none'
      : (withC.length > 1 ? 'pooled'
      : ((primary && srcLg && String(srcLg.id) === String(primary.id)) ? 'own' : 'other'));
    const source = {
      kind,
      leagueId: srcLg ? (srcLg.id || null) : null,
      league: srcLg ? srcLg.name : '',
      country: srcLg ? (srcLg.country || '') : '',
      cornerGames: withC.reduce((s, x) => s + x.cn, 0),
      fromLeagues: withC.map((x) => ({ id: x.id, name: x.name, country: x.country || '', games: x.games, cn: x.cn })),
      leagueAvgN: lm ? lm.n : 0,
      leaguePerMatch: lm ? lm.perMatch : null,
      min: min,
      usable: !!(lm && lm.usable)
    };
    return {
      id: a.id, name: a.name, abbr: a.abbr, badge: a.badge,
      league: primary ? primary.name : a.league,
      leagueId: primary ? (primary.id || null) : null,
      multiLeague: lgList.length > 1,
      leagues: lgList.map((x) => ({ id: x.id, name: x.name, country: x.country || '', games: x.games, cn: x.cn })),
      source, sourceLeague: source.league, sourceKind: source.kind,
      games: a.games,
      cornersFor: a.cn ? r1(a.cf / a.cn) : null, cornersAgainst: a.cn ? r1(a.ca / a.cn) : null,
      cornerSamples: a.cn,
      homeFor: a.hg ? r1(a.hf / a.hg) : null, awayFor: a.ag ? r1(a.af / a.ag) : null,
      goalsFor: r1(a.gf / a.games), goalsAgainst: r1(a.ga / a.games),
      _a: a
    };
}

/* Médias por time: agrega os jogos ENCERRADOS dos últimos N dias.
   Gols são reais; escanteios seguem estimados (o plano gratuito não expõe
   o endpoint de estatísticas por partida). Cada time leva `leagues` (em que
   competições jogou, com jogos e jogos COM escanteio) e `source`, que diz de
   QUAL liga veio a média: 'own' (a própria liga), 'other' (outra competição),
   'pooled' (mais de uma competição) ou 'none' (nenhuma amostra utilizável).
   A origem é propagada aqui, nunca inferida depois na interface. Cache: 6h. */
async function buildTeamAvg(env, key, days, ctx, min) {
  const paths = [];
  for (let d = 0; d < days; d++) paths.push('/fixtures?date=' + dayOffset(-d) + '&timezone=America/Sao_Paulo');

  const settled = await Promise.allSettled(paths.map((p) => upstream(p, key)));
  const good = settled.filter((r) => r.status === 'fulfilled' && r.value && r.value.ok &&
    r.value.json && Array.isArray(r.value.json.response));

  if (!good.length) {
    const any = settled.find((r) => r.status === 'fulfilled');
    return { error: 'Falha ao consultar a API-Football', detail: upstreamError(any && any.value), status: 502 };
  }

  const byId = new Map();
  good.forEach((r) => r.value.json.response.forEach((fx) => {
    if (fx && fx.fixture && fx.fixture.id) byId.set(fx.fixture.id, fx);
  }));

  // eixo de tempo: dias da janela em ordem crescente (para o gráfico de evolução)
  const dates = [];
  for (let d = days - 1; d >= 0; d--) dates.push(dayOffset(-d));
  const dIndex = {};
  dates.forEach((dt, i) => { dIndex[dt] = i; });
  const lgm = await leagueMap(ctx, min);

  const agg = new Map();
  let sampled = 0;

  byId.forEach((fx) => {
    const short = (fx.fixture.status || {}).short;
    if (!DONE_SHORT.includes(short)) return; // só jogos encerrados
    if (!fx.teams || !fx.teams.home || !fx.teams.away) return;
    sampled++;

    const est = estimate(fx, lgm[String((fx.league && fx.league.id) || '')] || null);
    const gh = (fx.goals && fx.goals.home) || 0;
    const ga = (fx.goals && fx.goals.away) || 0;
    const lg = (fx.league && fx.league.name) || '';
    const lgId = String((fx.league && fx.league.id) || '');
    const lgCountry = (fx.league && fx.league.country) || '';

    const sides = [
      { t: fx.teams.home, c: est.corners ? est.corners[0] : null, cc: est.corners ? est.corners[1] : null, gf: gh, gc: ga, home: true },
      { t: fx.teams.away, c: est.corners ? est.corners[1] : null, cc: est.corners ? est.corners[0] : null, gf: ga, gc: gh, home: false }
    ];

    sides.forEach((s) => {
      if (!s.t || !s.t.id) return;
      let a = agg.get(s.t.id);
      if (!a) {
        a = { id:s.t.id, name:s.t.name || '?', abbr:abbrOf(s.t.name), badge:s.t.logo || null, league:lg,
          games:0, cf:0, ca:0, gf:0, ga:0, hg:0, hf:0, ag:0, af:0, cn:0, perDay:{}, lg:{} };
        agg.set(s.t.id, a);
      }
      a.games++; a.gf += s.gf; a.ga += s.gc;
      if (s.c != null) {
        a.cn++; a.cf += s.c; a.ca += s.cc;
        if (s.home) { a.hg++; a.hf += s.c; } else { a.ag++; a.af += s.c; }
      }
      // de qual competição veio este jogo (e se ele tinha escanteio)
      const lk = lgId || ('n:' + lg);
      const le = a.lg[lk] || (a.lg[lk] = { id: lgId || null, name: lg, country: lgCountry, games: 0, cn: 0 });
      le.games++;
      if (s.c != null) le.cn++;
      if (!a.league && lg) a.league = lg;
      // acumulado por dia, para o gráfico de evolução das médias
      const dt = String(fx.fixture.date || '').slice(0, 10);
      if (dIndex[dt] != null) {
        const pd = a.perDay[dt] || (a.perDay[dt] = { cf:0, ca:0, gf:0, ga:0, n:0, cn:0 });
        pd.gf += s.gf; pd.ga += s.gc; pd.n++;
        if (s.c != null) { pd.cf += s.c; pd.ca += s.cc; pd.cn++; }
      }
    });
  });

  const r1 = (n) => Math.round(n * 10) / 10;

  // média ACUMULADA até cada dia da janela (é o que o gráfico desenha)
  const seriesOf = (a) => {
    const out = [];
    let cf = 0, ca = 0, gf = 0, ga = 0, n = 0, cn = 0;
    dates.forEach((dt) => {
      const pd = a.perDay[dt];
      if (pd) { cf += pd.cf; ca += pd.ca; gf += pd.gf; ga += pd.ga; n += pd.n; cn += pd.cn; }
      out.push(n ? { cf: cn ? r1(cf / cn) : null, ca: cn ? r1(ca / cn) : null, gf: r1(gf / n), ga: r1(ga / n), n, cn } : null);
    });
    return out;
  };

  const all = Array.from(agg.values()).map((a) => teamRecord(a, lgm, min))
    .sort((x, y) => ((y.cornersFor || -1) - (x.cornersFor || -1)) || (y.games - x.games));

  const teams = all.slice(0, 80).map((t) => {
    const o = Object.assign({}, t);
    delete o._a;
    return o;
  });

  const series = all.slice(0, SERIES_TEAMS).map((t) => ({
    id: t.id, name: t.name, abbr: t.abbr, points: seriesOf(t._a)
  }));

  const quota = good.map((r) => r.value.quota).find(Boolean) || null;

  return {
    payload: {
      generated: Date.now(),
      days,
      labels: dates,
      sampled,
      teams,
      series,
      seriesTeams: series.length,
      cornersAvailable: all.filter((t) => t.cornersFor != null).length,
      sourceCounts: {
        own: all.filter((t) => t.sourceKind === 'own').length,
        other: all.filter((t) => t.sourceKind === 'other').length,
        pooled: all.filter((t) => t.sourceKind === 'pooled').length,
        none: all.filter((t) => t.sourceKind === 'none').length
      },
      minLeagueSamples: min,
      leagueAverages: lgm,
      estimatedCorners: true,
      cornersSource: 'league',
      realGoals: true,
      quota
    }
  };
}

/* -------------------------------- infra ----------------------------------- */

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const list = String(env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);

  const headers = new Headers({
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'X-Quota-Remaining, X-Proxy-Cache',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  });

  let allowed = '';
  if (list.includes('*')) allowed = '*';
  else if (origin && (list.includes(origin) ||
    list.some((p) => p.startsWith('*.') && origin.endsWith(p.slice(1))))) allowed = origin;

  if (allowed) headers.set('Access-Control-Allow-Origin', allowed);
  return headers;
}

function json(obj, status, cors, extra) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
  cors.forEach((v, k) => headers.set(k, v));
  if (extra) Object.keys(extra).forEach((k) => { if (extra[k] != null) headers.set(k, String(extra[k])); });
  return new Response(JSON.stringify(obj), { status, headers });
}

function rateLimited(ip, limit) {
  const now = Date.now();
  const rec = buckets.get(ip);
  if (!rec || now > rec.reset) {
    if (buckets.size > 5000) buckets.clear();
    buckets.set(ip, { n: 1, reset: now + 60000 });
    return false;
  }
  rec.n += 1;
  return rec.n > limit;
}

async function cacheGet(key) {
  try {
    const c = caches.default;
    if (!c) return null;
    const hit = await c.match(key);
    if (!hit) return null;
    const body = await hit.text();
    return { body, status: hit.status };
  } catch (e) { return null; }
}
function cachePut(ctx, key, body, ttl) {
  try {
    const c = caches.default;
    if (!c || !ctx || !ctx.waitUntil) return;
    const res = new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'max-age=' + ttl } });
    ctx.waitUntil(c.put(key, res));
  } catch (e) { /* cache é opcional */ }
}

/* -------------------------------- handler --------------------------------- */

export default {
  /* exposto para testes de contrato do cliente x servidor; ignorado pelo runtime */
  __minFrom: minFrom,
  __cacheKeyFor: cacheKeyFor,
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, cors);

    if (url.pathname === '/health') {
      return json({
        ok: true,
        service: 'cornerpro-proxy',
        version: 2,
        configured: Boolean(env.APIFOOTBALL_KEY),
        routes: ['/derive/board', '/derive/teamavg', '/derive/leagueavg', '/derive/match', '/derive/h2h', '/fixtures', '/fixtures/statistics', '/leagues', '/status']
      }, 200, cors);
    }

    const isDerive = url.pathname === '/derive/board' || url.pathname === '/derive/teamavg' ||
      url.pathname === '/derive/leagueavg' || url.pathname === '/derive/match' || url.pathname === '/derive/h2h';
    const isPass = PASSTHROUGH.some((re) => re.test(url.pathname));
    if (!isDerive && !isPass) {
      return json({ error: 'Rota não permitida pelo proxy', path: url.pathname }, 403, cors);
    }

    const limit = (() => { const n = parseInt(env.RATE_LIMIT_PER_MIN, 10); return (isNaN(n) || n <= 0) ? RATE_DEFAULT : n; })();
    const ip = request.headers.get('CF-Connecting-IP') || 'anon';
    if (rateLimited(ip, limit)) {
      return json({ error: 'Limite de requisições atingido. Tente novamente em instantes.' }, 429, cors);
    }

    const key = env.APIFOOTBALL_KEY;
    if (!key) {
      return json({ error: 'Proxy sem chave: rode "wrangler secret put APIFOOTBALL_KEY" e publique de novo.' }, 503, cors);
    }

    /* ---- rotas derivadas (agregação e cache no servidor) ---- */
    if (isDerive) {
      const daysRaw = parseInt(url.searchParams.get('days'), 10);
      const days = isNaN(daysRaw) ? 1 : Math.max(0, Math.min(3, daysRaw));
      const taRaw = parseInt(url.searchParams.get('days'), 10);
      const taDays = isNaN(taRaw) ? 7 : Math.max(1, Math.min(14, taRaw));
      const id = url.searchParams.get('id');
      const home = url.searchParams.get('home');
      const away = url.searchParams.get('away');
      const min = minFrom(url.searchParams);

      /* (c) chave NORMALIZADA: o min cru sai da query e o efetivo entra como m=<n>.
         ?min=0, ?min=abc e a ausencia de parametro (mesmo min efetivo) passam a
         compartilhar UMA entrada de cache, em vez de gastar 3 slots e 3 chamadas. */
      const ck = cacheKeyFor(url.pathname, url.search, min, origin);
      const ttl = url.pathname === '/derive/board' ? TTL.board
        : url.pathname === '/derive/teamavg' ? TTL.teamavg
        : url.pathname === '/derive/leagueavg' ? TTL.league
        : (url.pathname === '/derive/h2h' ? TTL.h2h : TTL.match);
      const cached = await cacheGet(ck);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: (() => {
            const h = new Headers({ 'content-type': 'application/json; charset=utf-8' });
            cors.forEach((v, k) => h.set(k, v));
            h.set('X-Proxy-Cache', 'HIT');
            return h;
          })()
        });
      }

      let result;
      try {
        if (url.pathname === '/derive/board') result = await buildBoard(env, key, days, ctx, min);
        else if (url.pathname === '/derive/teamavg') result = await buildTeamAvg(env, key, taDays, ctx, min);
        else if (url.pathname === '/derive/leagueavg') result = { payload: { minSamples: min, leagues: await leagueMap(ctx, min) } };
        else if (url.pathname === '/derive/match') result = id ? await buildMatch(key, id, ctx, min) : { error: 'Informe ?id=', status: 400 };
        else result = await buildH2H(key, home, away);
      } catch (err) {
        result = { error: 'Falha ao contatar a API-Football', detail: String((err && err.message) || err), status: 502 };
      }

      if (result.error) return json(result, result.status || 502, cors);

      const body = JSON.stringify(result.payload);
      if (ttl > 0) cachePut(ctx, ck, body, ttl);
      const quota = result.payload && result.payload.quota;
      const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
      cors.forEach((v, k) => headers.set(k, v));
      headers.set('X-Proxy-Cache', 'MISS');
      headers.set('cache-control', 'public, max-age=' + ttl);
      if (quota && quota.remaining != null) headers.set('X-Quota-Remaining', String(quota.remaining));
      return new Response(body, { status: 200, headers });
    }

    /* ---- repasse direto (rotas conhecidas da API-Football) ---- */
    const v = await upstream(url.pathname + url.search, key);
    const headers = new Headers({ 'content-type': 'application/json; charset=utf-8' });
    cors.forEach((val, k) => headers.set(k, val));
    headers.set('cache-control', 'public, max-age=' + TTL.default);
    if (v.quota && v.quota.remaining != null) headers.set('X-Quota-Remaining', String(v.quota.remaining));
    return new Response(v.text, { status: v.status, headers });
  }
};
