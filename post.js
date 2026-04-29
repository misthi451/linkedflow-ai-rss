// ═══════════════════════════════════════════════════════════════
// LinkedFlow AI — LinkedIn Auto Post Script v3.0
// Topic: AI & Machine Learning
// Flow: AI/ML RSS Feed → Pick Article → Groq → LinkedIn Post
// 90+ Quality Target
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
const https = require('https');
const http  = require('http');
const ai    = require('./ai-wrapper');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN   = process.env.LI_TOKEN;
const LI_URN     = process.env.LI_URN     || 'urn:li:person:RnlYLWz_a3';
const POST_STYLE = process.env.POST_STYLE || 'auto';

// ── AI/ML FOCUSED RSS FEEDS ───────────────────────────────────────────────────
const AI_FEEDS = [
  'https://techcrunch.com/category/artificial-intelligence/feed/',
  'https://venturebeat.com/category/ai/feed/',
  'https://www.artificialintelligence-news.com/feed/',
  'https://huggingface.co/blog/feed.xml',
  'https://openai.com/blog/rss/',
  'https://www.deepmind.com/blog/rss.xml',
];

// ── FETCH RSS ─────────────────────────────────────────────────────────────────
function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'LinkedFlow-RSS/1.0' },
      timeout: 8000,
    }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchRSS(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data',  chunk => data += chunk);
      res.on('end',   ()    => resolve(data));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

// ── PARSE RSS XML ─────────────────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  // Also handle atom feed entries
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  const extract = (block) => {
    const get = (tag) => {
      const m = block.match(
        new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i')
      );
      return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
    };
    const title = get('title');
    const desc  = (get('description') || get('summary') || get('content')).substring(0, 500);
    const link  = get('link');
    const date  = get('pubDate') || get('published') || get('updated');
    if (title && title.length > 10) items.push({ title, desc, link, date });
  };

  while ((match = itemRegex.exec(xml))  !== null) extract(match[1]);
  while ((match = entryRegex.exec(xml)) !== null) extract(match[1]);
  return items;
}

// ── FETCH FROM MULTIPLE FEEDS ─────────────────────────────────────────────────
async function fetchAIArticles() {
  const allItems = [];
  for (const feed of AI_FEEDS) {
    try {
      console.log(`  Trying: ${feed}`);
      const xml   = await fetchRSS(feed);
      const items = parseRSS(xml);
      if (items.length > 0) {
        allItems.push(...items.slice(0, 3)); // top 3 from each feed
        console.log(`  ✅ Got ${items.length} articles`);
      }
    } catch (err) {
      console.log(`  ⚠️ Skipped: ${err.message}`);
    }
  }
  return allItems;
}

// ── FILTER AI/ML ARTICLES ─────────────────────────────────────────────────────
function filterAIArticles(items) {
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'llm', 'gpt', 'claude', 'gemini', 'neural', 'model', 'training',
    'transformer', 'generative', 'chatbot', 'automation', 'algorithm',
    'openai', 'anthropic', 'google ai', 'deepmind', 'hugging face',
    'computer vision', 'nlp', 'reinforcement', 'dataset', 'inference',
    'agent', 'rag', 'fine-tun', 'benchmark', 'multimodal',
  ];
  const filtered = items.filter(item => {
    const text = (item.title + ' ' + item.desc).toLowerCase();
    return aiKeywords.some(kw => text.includes(kw));
  });
  return filtered.length > 0 ? filtered : items; // fallback to all if none match
}

// ── PICK ARTICLE ──────────────────────────────────────────────────────────────
function pickArticle(items) {
  const hour = new Date().getUTCHours();
  const idx  = hour < 12 ? 0 : 1;
  return items[idx % items.length];
}

// ── GENERATE HIGH QUALITY AI/ML POST ─────────────────────────────────────────
async function generatePost(article) {
  const styles = ['authority', 'educational', 'opinion', 'story'];
  const style  = POST_STYLE === 'auto'
    ? styles[new Date().getDay() % styles.length]
    : POST_STYLE;

  const styleGuides = {
    authority: `You are a senior AI researcher and tech executive with 15+ years in machine learning.
Write a thought leadership post in FIRST PERSON about this AI/ML topic.

Structure:
- Line 1: ONE bold, counter-intuitive claim about AI/ML (MAX 10 words, no "I" or "We", start with a number or shocking fact)
- [blank line]
- Lines 3-6: Why this matters right now — cite the specific shift happening in the industry with real context and technical depth
- [blank line]
- Lines 8-14: 3 specific technical insights using "→" — be precise, include real metrics, model names, and production impact
- [blank line]
- Lines 16-18: Personal observation from your experience building AI systems — be specific, include a concrete example or outcome
- [blank line]
- Lines 20-21: What this means for the next 12 months of AI development — forward-looking, grounded in current research
- [blank line]
- Last content line: ONE sharp question about the future of AI that sparks technical debate
- Last line: #ArtificialIntelligence #MachineLearning #GenerativeAI #TechLeadership #LLM #DeepLearning + 1 topic-specific hashtag`,

    educational: `You are an AI/ML educator who has trained hundreds of engineers on machine learning.
Write a teaching post in FIRST PERSON that makes a complex AI concept deeply understandable and actionable.

Structure:
- Line 1-2: "Most engineers misunderstand [specific AI concept]. Here's what's actually happening." (MAX 10 words on line 1)
- [blank line]
- Lines 4-6: The common misconception — be specific, name the exact wrong mental model most people have
- [blank line]
- Lines 8-18: 3 numbered lessons with concrete, technical examples from real AI systems — include code concepts, architecture decisions, or training details
- [blank line]
- Lines 20-22: The practical impact — how this changes how you build, deploy, or evaluate AI products in production
- [blank line]
- Lines 24-25: A real-world case study or benchmark that proves the point with specific numbers
- [blank line]
- Last content line: "Which of these changed how you think about [topic]?"
- Last line: #ArtificialIntelligence #MachineLearning #MLEngineering #DeepLearning #DataScience #AIEngineering + 1 topic-specific hashtag`,

    opinion: `You are a contrarian AI researcher who challenges hype with data and first principles.
Write an opinion post in FIRST PERSON that challenges a widely-held AI belief.

Structure:
- Line 1: "Hot take: [bold claim about AI that most people strongly disagree with]" (MAX 10 words after "Hot take:")
- [blank line]
- Lines 3-5: What the AI community currently believes — articulate the hype clearly and fairly
- [blank line]
- Lines 7-13: Why they're wrong — cite technical evidence, specific benchmarks, peer-reviewed research, or real-world failure data
- [blank line]
- Lines 15-18: What the research actually shows — name the papers, authors, or companies with specific findings and numbers
- [blank line]
- Lines 20-22: What engineering teams should actually do instead — specific, actionable, technically sound advice
- [blank line]
- Lines 24-25: The broader implication for AI development if this misconception persists
- [blank line]
- Last content line: "Disagree? Tell me exactly where my reasoning breaks."
- Last line: #ArtificialIntelligence #MachineLearning #GenerativeAI #AIStrategy #TechOpinion #FutureOfAI + 1 topic-specific hashtag`,

    story: `You are an AI engineer sharing a real, detailed story from building production ML systems.
Write in FIRST PERSON. Be specific, technical, and human. Make it feel real.

Structure:
- Line 1-2: Specific scene — paint a vivid picture: time, place, what was broken (MAX 10 words on line 1)
- [blank line]
- Lines 4-7: The technical problem — be precise: what model, what failure mode, what the error logs showed, why it mattered
- [blank line]
- Lines 9-12: What we tried first and why it failed — show the debugging process, the wrong hypotheses
- [blank line]
- Lines 14-17: The unexpected insight that changed everything — the technical turning point with a clear explanation of why it worked
- [blank line]
- Lines 19-22: What happened after — specific metrics: latency, accuracy, cost, throughput — before vs after numbers
- [blank line]
- Lines 24-26: The engineering principle you took away — generalizable, technical, and transferable to other AI systems
- [blank line]
- Last content line: A question connecting your story directly to a challenge the reader faces in their own AI work
- Last line: #ArtificialIntelligence #MachineLearning #MLOps #AIEngineering #BuildingWithAI #ProductionML + 1 topic-specific hashtag`,
  };

  const prompt = `${styleGuides[style]}

Write about this AI/ML article:
Title: ${article.title}
Summary: ${article.desc}

STRICT QUALITY RULES — post must score 90+ on LinkedIn:
1. First line: MAX 10 words. No "I" or "We". Start with a number, bold fact, or shocking stat — make it impossible to scroll past
2. Use real, specific technical terms throughout — transformers, attention heads, embeddings, fine-tuning, RLHF, RAG, inference latency, VRAM, quantization, LoRA, etc.
3. Include at least TWO specific numbers, metrics, or benchmarks (e.g. "40% faster", "3.5B parameters", "dropped hallucination rate from 12% to 4%")
4. Write EXACTLY 300-400 words — count carefully, not less, not more
5. Maximum 2 sentences per paragraph — use white space generously for LinkedIn readability
6. BANNED words: "game-changer", "revolutionize", "groundbreaking", "exciting", "amazing", "incredible", "transformative", "unlock potential" — instant quality killer
7. Sound like a real AI engineer/researcher who has shipped models to production — not a LinkedIn content marketer
8. Every paragraph must teach or reveal something — zero filler, zero padding, zero throat-clearing
9. Include one real-world production scenario, deployment challenge, or benchmark comparison
10. End with a debate-sparking question that a senior ML engineer would genuinely want to answer
11. Hashtags: exactly 6-7 on the very last line, all major tech hashtags with 500k+ LinkedIn followers
12. The reader must feel measurably smarter and more informed after reading — that is the only success metric

Write ONLY the post. No intro. No "Here's my post:". No meta-commentary. Just the post text.`;

  console.log(`\n🤖 Generating high-quality AI/ML ${style} post with Groq...`);

  const postText = await ai.chat(prompt, {
    provider   : 'groq',
    model      : 'llama-3.3-70b-versatile',
    temperature: 0.78,
    maxTokens  : 1200,
  });

  return { text: postText.trim(), style };
}

// ── POST TO LINKEDIN ──────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) return reject(new Error('LI_TOKEN not set in .env!'));

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
  console.log('🚀 LinkedFlow AI v3.0 — AI/ML Edition');
  console.log(`📅 ${new Date().toISOString()}`);

  // Step 1: Fetch AI/ML articles from multiple feeds
  console.log('\n⏳ Fetching AI/ML articles from multiple sources...');
  const allItems     = await fetchAIArticles();
  const aiItems      = filterAIArticles(allItems);

  if (!aiItems.length) throw new Error('No AI/ML articles found!');
  console.log(`\n✅ Found ${aiItems.length} relevant AI/ML articles`);

  // Step 2: Pick best article
  const article = pickArticle(aiItems);
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
