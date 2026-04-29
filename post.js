// ═══════════════════════════════════════════════════════════════
// LinkedFlow AI — LinkedIn Auto Post Script v2.0
// Flow: RSS Feed → Pick Article → Groq AI → LinkedIn Post
// High Quality Posts — 90+ Rating Target
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
    const desc  = get('description').substring(0, 500);
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

// ── GENERATE HIGH QUALITY POST WITH GROQ ─────────────────────────────────────
async function generatePost(article) {
  const styles = ['authority', 'educational', 'opinion', 'story'];
  const style  = POST_STYLE === 'auto'
    ? styles[new Date().getDay() % styles.length]
    : POST_STYLE;

  const styleGuides = {
    authority: `
You are a senior tech executive with 15+ years of experience who just read something that changed your thinking.

Write in FIRST PERSON. Be specific. Be bold.

Structure:
- Line 1-2: ONE powerful statement that challenges conventional thinking. No fluff.
- Line 3: Empty line
- Lines 4-6: Context — why this matters RIGHT NOW. Use numbers/data if possible.
- Line 7: Empty line  
- Lines 8-12: Your 3 specific insights, each starting with "→"
- Line 13: Empty line
- Lines 14-15: A sharp personal observation from your experience
- Line 16: Empty line
- Last line: ONE provocative question that makes readers stop and think
- Final line: 4-5 hashtags`,

    educational: `
You are a tech educator who makes complex things simple and actionable.

Write in FIRST PERSON. Teach from experience, not theory.

Structure:
- Line 1-2: Start with "I spent [X] years learning what most people get wrong about [topic]."
- Line 3: Empty line
- Lines 4-5: The common mistake or misconception
- Line 6: Empty line
- Lines 7-15: 3 specific numbered lessons with concrete examples
- Line 16: Empty line
- Lines 17-18: The real-world impact of applying these lessons
- Line 19: Empty line
- Last line: "Which of these surprised you most?"
- Final line: 4-5 hashtags`,

    opinion: `
You are a contrarian tech thinker who challenges the status quo with evidence.

Write in FIRST PERSON. Be controversial but backed by logic.

Structure:
- Line 1: "Hot take:" or "Unpopular opinion:" — then your bold claim
- Line 2: Empty line
- Lines 3-4: What everyone else believes (the conventional wisdom)
- Line 5: Empty line
- Lines 6-10: Why they're wrong — your specific evidence and reasoning
- Line 11: Empty line
- Lines 12-14: What the data/reality actually shows
- Line 15: Empty line
- Lines 16-17: The implication — what should change
- Line 18: Empty line
- Last line: "Disagree? Tell me where my logic breaks."
- Final line: 4-5 hashtags`,

    story: `
You are a tech professional sharing a real, personal story that taught you something unexpected.

Write in FIRST PERSON. Be vulnerable and specific. Make it feel real.

Structure:
- Line 1-2: Set the scene with a specific moment. "Three years ago, I watched a team of 20 engineers..."
- Line 3: Empty line
- Lines 4-6: The problem or challenge — make it relatable
- Line 7: Empty line
- Lines 8-10: The unexpected turning point or insight
- Line 11: Empty line
- Lines 12-14: What happened as a result — be specific with outcomes
- Line 15: Empty line
- Lines 16-17: The lesson distilled into one clear principle
- Line 18: Empty line
- Last line: A question that connects the story to the reader's life
- Final line: 4-5 hashtags`,
  };

  const prompt = `${styleGuides[style]}

Now write a LinkedIn post about this article:

Article Title: ${article.title}
Article Summary: ${article.desc}

QUALITY REQUIREMENTS (this post must score 90+ on LinkedIn engagement):
1. Hook: First line must stop scrolling — use a surprising stat, bold claim, or unexpected statement
2. Specificity: Use concrete numbers, timeframes, and examples — never be vague
3. Personal: Write as if you personally experienced or witnessed this — use "I", "my team", "I've seen"
4. Tension: Create a problem in the first half, resolve it in the second half
5. Readability: Maximum 2 sentences per paragraph. Lots of white space.
6. Emotion: Make the reader feel something — curiosity, urgency, or validation
7. CTA: End with a question that's easy to answer and sparks discussion
8. Length: 200-280 words — not too short, not too long

Write ONLY the post. No intro. No explanation. Just the post.`;

  console.log(`\n🤖 Generating high-quality ${style} post with Groq...`);

  const postText = await ai.chat(prompt, {
    provider   : 'groq',
    model      : 'llama-3.3-70b-versatile',
    temperature: 0.75,
    maxTokens  : 900,
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
  console.log('🚀 LinkedFlow AI v2.0 starting...');
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

  // Step 3: Generate high quality post
  const { text, style } = await generatePost(article);
  console.log(`🎨 Style: ${style}`);
  console.log('\n📝 Post preview:');
  console.log('─'.repeat(60));
  console.log(text);
  console.log('─'.repeat(60));
  console.log(`📊 Word count: ${text.split(' ').length}`);

  // Step 4: Post to LinkedIn
  console.log('\n📤 Posting to LinkedIn...');
  const result = await postToLinkedIn(text);
  console.log('✅ Posted successfully!', result);
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
