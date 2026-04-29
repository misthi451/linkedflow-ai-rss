// ═══════════════════════════════════════════════════════════════
// LinkedFlow AI — LinkedIn Auto Post Script
// Flow: RSS Feed → Pick Article → Groq AI → LinkedIn Post
// Runs via EC2 cron job 2x per day
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
const https = require('https');
const http  = require('http');
const ai    = require('./ai-wrapper');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN   = process.env.LI_TOKEN;
const LI_URN     = process.env.LI_URN     || 'urn:li:person:RnlYLWz_a3';
const FEED_URL   = process.env.FEED_URL   || 'https://techcrunch.com/feed/';
const POST_STYLE = process.env.POST_STYLE || 'auto';

// ── FETCH RSS ─────────────────────────────────────────────────────────────────
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'LinkedFlow-RSS/1.0' } }, (res) => {
      let data = '';
      res.on('data',  chunk => data += chunk);
      res.on('end',   ()    => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// ── PARSE RSS XML ─────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(
        new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
      );
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const title = get('title');
    const desc  = get('description').substring(0, 400);
    const link  = get('link');
    const date  = get('pubDate');
    if (title) items.push({ title, desc, link, date });
  }
  return items;
}

// ── PICK ARTICLE ──────────────────────────────────────────────────────────────
function pickArticle(items) {
  const hour = new Date().getUTCHours();
  const idx  = hour < 12 ? 0 : 1;
  return items[idx % items.length];
}

// ── GENERATE POST WITH GROQ ───────────────────────────────────────────────────
async function generatePost(article) {
  const styles = ['authority', 'educational', 'opinion', 'story'];
  const style  = POST_STYLE === 'auto'
    ? styles[new Date().getDay() % styles.length]
    : POST_STYLE;

  const styleGuides = {
    authority:
      'Write as a bold thought leader. Open with a provocative 1-2 line claim that stops scrolling. Build tension with context. Give 3 sharp bullet insights using ->. End with ONE question that sparks debate.',
    educational:
      'Write as a teacher. Open with "Most [people/teams/companies] get X wrong." Break it down with 3 numbered insights. End with a question like "Which of these is your team skipping?"',
    opinion:
      'Write as someone with a spicy take. Open with "Hot take:" or "Unpopular opinion:". Challenge conventional wisdom confidently. End with "Disagree? Tell me where this breaks."',
    story:
      'Write as a storyteller. Open with a specific person (use a name like Priya, Alex, Marcus). Make it personal and human. Share a surprising insight or reversal. End with a lesson or question.',
  };

  const prompt = `You are a LinkedIn content strategist who writes viral posts for tech professionals.

Write a LinkedIn post based on this article:

Title: ${article.title}
Summary: ${article.desc}

Style: ${style}
Instructions: ${styleGuides[style]}

Hard rules:
- 150-250 words total
- Short paragraphs, use blank lines between them
- No emojis except 1-2 max if truly needed
- Do NOT mention the article URL or say "according to"
- Sound like a real senior tech professional, not an AI bot
- End with exactly 4-5 hashtags on the last line (e.g. #AI #GenerativeAI #TechLeadership #Innovation)
- Write ONLY the post text, nothing else

Post:`;

  console.log(`\n🤖 Generating ${style} post with Groq...`);

  const postText = await ai.chat(prompt, {
    provider   : 'groq',
    model      : 'llama-3.3-70b-versatile',
    temperature: 0.82,
    maxTokens  : 700,
  });

  return { text: postText.trim(), style };
}

// ── POST TO LINKEDIN ──────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) {
      return reject(new Error('LI_TOKEN not set in .env!'));
    }
    const body = JSON.stringify({
      author        : LI_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary   : { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    });

    const options = {
      hostname: 'api.linkedin.com',
      path    : '/v2/ugcPosts',
      method  : 'POST',
      headers : {
        'Authorization'            : `Bearer ${LI_TOKEN}`,
        'Content-Type'             : 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Length'           : Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) resolve({ success: true });
        else reject(new Error(`LinkedIn API ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 LinkedFlow AI starting...');
  console.log(`📅 ${new Date().toISOString()}`);
  console.log(`📡 RSS Feed: ${FEED_URL}`);

  // Step 1: Fetch RSS
  console.log('\n⏳ Fetching RSS feed...');
  const xml   = await fetchRSS(FEED_URL);
  const items = parseRSS(xml);

  if (!items.length) throw new Error('No articles found in RSS feed!');
  console.log(`✅ Found ${items.length} articles`);

  // Step 2: Pick article
  const article = pickArticle(items);
  console.log(`\n📰 Selected: "${article.title}"`);
  console.log(`🔗 ${article.link}`);

  // Step 3: Generate post with Groq
  const { text, style } = await generatePost(article);
  console.log(`🎨 Style: ${style}`);
  console.log('\n📝 Post preview:');
  console.log('─'.repeat(60));
  console.log(text);
  console.log('─'.repeat(60));

  // Step 4: Post to LinkedIn
  console.log('\n📤 Posting to LinkedIn...');
  const result = await postToLinkedIn(text);
  console.log('✅ Posted successfully!', result);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
