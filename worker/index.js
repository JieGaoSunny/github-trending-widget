// GitHub Trending Cloudflare Worker
// GET / → top 10 trending repos with Chinese summaries

const CACHE_TTL = 4 * 60 * 60;

export default {
  async fetch(request, env) {
    const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const url = new URL(request.url);

    // Debug endpoint
    if (url.pathname === '/debug') {
      try {
        const res = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
          messages: [{ role: 'user', content: 'Say hello in Chinese, one word only' }],
          max_tokens: 20,
        });
        return new Response(JSON.stringify({ ok: true, res }), { headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message, stack: e.stack }), { headers: corsHeaders });
      }
    }

    const cached = await env.TRENDING_CACHE.get('data', { type: 'json' });
    if (cached) {
      const age = Math.floor(Date.now() / 1000) - cached.timestamp;
      if (age < CACHE_TTL) {
        return new Response(JSON.stringify(cached), { headers: corsHeaders });
      }
    }

    try {
      const repos = await fetchTrending();
      // Generate Chinese summaries via Workers AI
      const reposWithSummary = await addSummaries(repos, env);
      const result = { repos: reposWithSummary, timestamp: Math.floor(Date.now() / 1000) };
      await env.TRENDING_CACHE.put('data', JSON.stringify(result));
      return new Response(JSON.stringify(result), { headers: corsHeaders });
    } catch (e) {
      if (cached) return new Response(JSON.stringify(cached), { headers: corsHeaders });
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  },
};

async function addSummaries(repos, env) {
  const prompt = repos.map((r, i) => `${i + 1}. ${r.fullName}: ${r.description}`).join('\n');
  try {
    const res = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: '你是技术翻译。把每个GitHub项目用一句中文概括（20-30字），说清楚项目做什么。只输出编号和中文。格式：1. 中文' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
    });
    const text = typeof res === 'string' ? res : (res?.response || JSON.stringify(res));
    const lines = text.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/(\d+)[\.\、\)\s]+(.+)/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        if (idx >= 0 && idx < repos.length) {
          repos[idx].summary = match[2].trim().slice(0, 40);
        }
      }
    }
  } catch (e) {
    // silent fail
  }
  for (const r of repos) {
    if (!r.summary) r.summary = r.description.slice(0, 25);
  }
  return repos;
}

async function fetchTrending() {
  const res = await fetch('https://github.com/trending', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Accept': 'text/html' },
  });
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const repos = parseTrending(await res.text());
  repos.sort((a, b) => b.starsToday - a.starsToday);
  return repos;
}

function parseTrending(html) {
  const repos = [];
  const articleRegex = /<article class="Box-row">([\s\S]*?)<\/article>/g;
  let match;
  while ((match = articleRegex.exec(html)) !== null && repos.length < 12) {
    const block = match[1];
    const nameMatch = block.match(/<h2[\s\S]*?<a[^>]*href="\/([^"?]+)"[^>]*>/);
    if (!nameMatch) continue;
    const fullName = nameMatch[1].replace(/\s+/g, '').trim();
    if (fullName.includes('login') || fullName.includes('sponsors/')) continue;

    const descMatch = block.match(/<p class="[^"]*">([\s\S]*?)<\/p>/);
    const description = descMatch ? descMatch[1].trim().replace(/<[^>]+>/g, '').trim() : '';
    const langMatch = block.match(/itemprop="programmingLanguage">(.*?)<\/span>/);
    const language = langMatch ? langMatch[1].trim() : '';
    const starsMatch = block.match(/([\d,]+)\s+stars today/);
    const starsToday = starsMatch ? parseInt(starsMatch[1].replace(/,/g, '')) : 0;
    const totalMatch = block.match(/\/stargazers[\s\S]*?([\d,]+)\s*<\/a>/);
    const totalStars = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '').trim()) : 0;

    repos.push({ fullName, description: description.slice(0, 120), language, starsToday, totalStars });
  }
  return repos;
}
