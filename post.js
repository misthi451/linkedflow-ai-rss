// LinkedIn Auto Post Script
// Runs via GitHub Actions — no browser needed!

const https = require('https');

// ── CONFIG ────────────────────────────────────────────────────────────────────
const LI_TOKEN = process.env.LI_TOKEN;
const LI_URN   = process.env.LI_URN   || 'urn:li:person:1772788136593';
const FEED_KEY = process.env.FEED_KEY  || 'tech';

// ── ARTICLE BANK (Tech/AI focused) ───────────────────────────────────────────
const ARTICLES = [
  // 🚀 New Models
  { title: "Meta Releases Llama 4 — Open Source Just Caught Up to GPT-4", desc: "Llama 4's mixture-of-experts architecture matches closed frontier models on most benchmarks. The open source vs closed model debate just got a lot more interesting." },
  { title: "Google DeepMind's Gemini 2.0 Rewrites the Rules on Multimodal AI", desc: "Native audio, image, and video understanding in a single model. The architecture shift from text-first to truly multimodal changes how we think about AI system design." },
  { title: "Mistral's New Model Runs on a Laptop — And It's Surprisingly Good", desc: "7B parameters, 4-bit quantized, running locally at 40 tokens/second. The gap between cloud and edge AI just closed by a significant margin." },
  { title: "Anthropic's Claude 3.5 Sets a New Bar for Code Generation", desc: "Beating GPT-4 on SWE-bench with 49% solve rate. The architectural changes behind this jump are more interesting than the benchmark number itself." },
  { title: "OpenAI o3 Reasoning Model: What the New Architecture Actually Changes", desc: "Chain-of-thought is now a first-class citizen in the model architecture, not a prompting trick. This changes how you build reliable AI systems fundamentally." },

  // 🏗️ New Architectures
  { title: "Mamba Architecture Is Replacing Transformers in Production — Here's Why", desc: "State space models process sequences in O(n) instead of O(n²). For long context, the performance difference is not marginal — it's an order of magnitude." },
  { title: "Mixture of Experts Is Now the Default Architecture for Frontier Models", desc: "GPT-4, Gemini, Mixtral, Llama 4 — they all use MoE. Understanding why this architecture won matters more than knowing it exists." },
  { title: "The New Diffusion Architecture That's Making Image Generation 10x Faster", desc: "Consistency models and flow matching are replacing DDPM. The inference speed improvement makes real-time image generation practical for the first time." },
  { title: "Why Everyone Is Moving From RAG to Agentic Retrieval in 2026", desc: "Static RAG pipelines break on complex queries. Agentic retrieval — where the model decides what to look up and when — solves the problems RAG couldn't." },
  { title: "Kolmogorov-Arnold Networks: The Architecture That Challenges MLPs", desc: "KANs replace fixed activation functions with learnable splines on edges. Smaller, more interpretable, and surprisingly competitive on scientific tasks." },

  // ⚙️ New Frameworks & Tools
  { title: "LangGraph Is Replacing LangChain for Production AI Agents", desc: "Stateful, cyclical graphs instead of linear chains. The mental model shift is significant — and the production stability difference is even more so." },
  { title: "DSPy: The Framework That's Killing Hand-Written Prompts", desc: "Compile your prompts instead of writing them. DSPy optimizes prompts automatically using your data. The prompting-as-code paradigm is here." },
  { title: "Vercel's AI SDK 4.0 Makes Streaming LLM Responses Trivial", desc: "Unified API across OpenAI, Anthropic, Mistral, and Cohere. Structured outputs, tool calling, and streaming — all with the same three lines of code." },
  { title: "Ollama Just Made Local LLM Deployment as Easy as Docker", desc: "Pull, run, and serve any open source model in under 60 seconds. The local-first AI development workflow is now accessible to every developer." },
  { title: "CrewAI vs AutoGen vs LangGraph — The Multi-Agent Framework Comparison Nobody Did Properly", desc: "After building the same agent system in all three, the differences in reliability, debuggability, and production readiness are stark. Here's the honest breakdown." },

  // 🎨 New Designs & Patterns
  { title: "The Context Window Is Now a Design Surface — Not Just a Limit", desc: "With 1M+ token windows, the constraint has flipped. The hard problem is now what to put in context, not whether it fits. This changes AI system architecture completely." },
  { title: "Function Calling Is Obsolete — Structured Outputs Are the New Primitive", desc: "JSON mode was a hack. Native structured outputs with schema validation change how you build reliable AI pipelines. The reliability improvement is not subtle." },
  { title: "The Evaluation-Driven Development Pattern for AI Systems", desc: "Build your evals before your prompts. The teams shipping reliable AI in production have adopted this discipline. It's the TDD moment for AI engineering." },
  { title: "Constitutional AI: The Design Pattern Behind Claude's Reliability", desc: "RLAIF instead of RLHF, with explicit principles. The architectural choice explains why some models are more consistently useful than others across edge cases." },
  { title: "Vector Databases Are Being Replaced — Here's What Comes Next", desc: "Hybrid search combining dense vectors with sparse BM25 retrieval outperforms pure vector search on real-world queries. The all-vector approach has a ceiling." },
];


// ── STYLES ────────────────────────────────────────────────────────────────────
const STYLES = ['authority', 'educational', 'opinion', 'story'];
const dayOfWeek = new Date().getDay();
const hourOfDay = new Date().getHours();
const style     = STYLES[dayOfWeek % STYLES.length];
const articleIdx = (dayOfWeek * 2 + (hourOfDay > 12 ? 1 : 0)) % ARTICLES.length;
const article    = ARTICLES[articleIdx];

// ── SMART HASHTAGS ────────────────────────────────────────────────────────────
function getHashtags(title, desc) {
  const hashMap = [
    { words: ['gpt','chatgpt','openai','claude','llm','llms','language model'], tag: '#LLMs' },
    { words: ['generative','genai','gen ai','stable diffusion'],                tag: '#GenerativeAI' },
    { words: ['machine learning','ml model','training','fine-tun','dataset'],   tag: '#MachineLearning' },
    { words: ['deep learning','neural','transformer'],                          tag: '#DeepLearning' },
    { words: ['agi','artificial general','superintelligence'],                  tag: '#AGI' },
    { words: ['prompt','prompting','prompt engineering'],                       tag: '#PromptEngineering' },
    { words: ['agent','agentic','autonomous','multi-agent'],                    tag: '#AIAgents' },
    { words: ['copilot','cursor','ai coding','ai tool'],                        tag: '#AITools' },
    { words: ['mlops','llmops','deployment','inference'],                       tag: '#MLOps' },
    { words: ['open source','hugging face','mistral','llama'],                  tag: '#OpenSourceAI' },
    { words: ['safety','alignment','hallucin','bias','ethics'],                 tag: '#AIEthics' },
    { words: ['startup','founder','seed','venture','fundrais'],                 tag: '#TechStartups' },
    { words: ['product manager','product management','roadmap'],                tag: '#ProductManagement' },
    { words: ['engineer','software','coding','developer'],                      tag: '#SoftwareEngineering' },
    { words: ['cloud','aws','gcp','azure','kubernetes'],                        tag: '#CloudComputing' },
    { words: ['career','hiring','interview','layoff'],                          tag: '#TechCareers' },
    { words: ['leadership','manager','cto','engineering manager'],              tag: '#TechLeadership' },
    { words: ['remote','async','productivity','workflow'],                      tag: '#FutureOfWork' },
    { words: ['research','paper','study','benchmark'],                          tag: '#AIResearch' },
    { words: ['innovation','breakthrough','disrupt'],                           tag: '#Innovation' },
  ];
  const txt     = (title + ' ' + desc).toLowerCase();
  const matched = hashMap.filter(h => h.words.some(w => txt.includes(w))).map(h => h.tag);
  return [...new Set(['#AI', '#Tech', ...matched])].slice(0, 5).join(' ');
}

// ── GENERATE POST ─────────────────────────────────────────────────────────────
function generatePost(article, style) {
  const { title, desc } = article;
  const day  = new Date().getDate();
  const pick = arr => arr[day % arr.length];
  const txt  = (title + ' ' + desc).toLowerCase();

  // ── TOPIC DETECTION ───────────────────────────────────────────────────────
  const isLeadership = txt.includes('leader') || txt.includes('manag') || txt.includes('team') || txt.includes('psycholog') || txt.includes('culture') || txt.includes('communication') || txt.includes('trust') || txt.includes('organization') || txt.includes('uncertain');
  const isAIModel    = txt.includes('gpt') || txt.includes('claude') || txt.includes('gemini') || txt.includes('llama') || txt.includes('mistral') || txt.includes('llm') || txt.includes('new model') || txt.includes('open source model');
  const isAIArch     = txt.includes('architecture') || txt.includes('transformer') || txt.includes('mamba') || txt.includes('moe') || txt.includes('neural network');
  const isProduct    = txt.includes('product') || txt.includes('startup') || txt.includes('founder') || txt.includes('pmf') || txt.includes('scale') || txt.includes('ship') || txt.includes('user');
  const isFramework  = txt.includes('framework') || txt.includes('library') || txt.includes('langgraph') || txt.includes('langchain') || txt.includes('dspy') || txt.includes('ollama');
  const isCareer     = txt.includes('career') || txt.includes('hiring') || txt.includes('skill') || txt.includes('developer') || txt.includes('engineer') || txt.includes('job');
  const isResearch   = txt.includes('research') || txt.includes('study') || txt.includes('data show') || txt.includes('survey') || txt.includes('500 compan') || txt.includes('companies show');
  const isGenAI      = isAIModel || isAIArch || (txt.includes('ai') && !isLeadership && !isProduct);

  // ── AUDIENCE-FIRST HASHTAGS ───────────────────────────────────────────────
  let tags = '';
  if     (isLeadership && isResearch && !isGenAI) tags = '#Leadership #FutureOfWork #OrganizationalCulture #PsychologicalSafety';
  else if(isLeadership && !isGenAI)               tags = '#Leadership #TechLeadership #FutureOfWork #TeamCulture';
  else if(isAIModel)                              tags = '#GenerativeAI #AIStrategy #TechLeadership #LLMs';
  else if(isAIArch)                               tags = '#AIStrategy #GenerativeAI #TechLeadership #DigitalTransformation';
  else if(isProduct && isGenAI)                   tags = '#AIProduct #ProductThinking #BuildInPublic #GenerativeAI';
  else if(isProduct)                              tags = '#ProductThinking #StartupLife #BuildInPublic #TechLeadership';
  else if(isFramework)                            tags = '#AIStrategy #GenerativeAI #BuildInPublic #TechLeadership';
  else if(isCareer && isGenAI)                    tags = '#AIStrategy #TechCareers #SoftwareEngineering #FutureOfWork';
  else if(isCareer)                               tags = '#TechCareers #SoftwareEngineering #FutureOfWork #Leadership';
  else if(isGenAI)                                tags = '#AIStrategy #GenerativeAI #TechLeadership #DigitalTransformation';
  else                                            tags = '#TechLeadership #Innovation #FutureOfWork #DigitalTransformation';

  // ─────────────────────────────────────────────────────────────────────────
  // HPC FORMAT — topic-consistent throughout
  // HOOK   → 1-2 lines. Bold claim. Stops scroll.
  // PLOT   → Title + desc + bridge lines. SAME topic as hook.
  // CLIMAX → Sharp insight. ONE closing question. SAME topic.
  // ─────────────────────────────────────────────────────────────────────────

  if(style === 'authority'){

    if(isLeadership && !isGenAI){
      const t = [
`Most leadership advice is written for stable times.
Almost none of it is written for right now.

${title}.

${desc}

Here's what the research shows about leaders who perform in uncertainty:

→ They over-communicate context, not just decisions
→ They create psychological safety before demanding accountability
→ They separate "what we know" from "what we're betting on" — explicitly

The leaders who build the most resilient teams aren't the most confident.
They're the most honest about what they don't know yet.

How clearly does your team understand the difference between your certainties and your bets?`,

`The data on high-performing teams is consistent.
Most managers are still ignoring the most important variable.

${title}.

${desc}

Across 500+ companies, the research finds the same result:
Psychological safety predicts team performance more reliably than talent, compensation, or process.

Not because safety is soft.
Because people don't take risks, share bad news, or admit mistakes in unsafe environments.
And without those three things, no team can learn fast enough.

The best leaders don't manage performance.
They architect the conditions where performance becomes inevitable.

What's one thing you could change this week to make your team feel safer to speak up?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isProduct){
      const t = [
`Most products don't fail because of bad execution.
They fail because of good execution on the wrong problem.

${title}.

${desc}

The research is consistent:
→ 42% of startups fail because there was no market need — not because the product was bad
→ Teams that talk to users weekly are 3x more likely to reach product-market fit
→ The top retention signal: would users be "very disappointed" without your product?

The companies that scale aren't the ones who moved fastest.
They're the ones who got obsessively specific — one user, one problem, one moment.

Who is the one specific person your product exists for?`,

`The best founders aren't the smartest people in the room.
They're the most specific.

${title}.

${desc}

What separates products that scale from products that stall:

The ones that scale solve one painful problem completely for one specific person.
The ones that stall solve three medium problems partially for a vague audience.

Specificity isn't a constraint. It's the entire strategy.

What would you stop building if you had to get 10x more specific about who you're building for?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isCareer){
      const t = [
`The most in-demand engineers in 2026 aren't the fastest coders.
They're the clearest thinkers.

${title}.

${desc}

Here's what's actually separating top engineers from everyone else right now:

→ They define the problem before writing a single line of code
→ They ask "what breaks?" before asking "how do I build it?"
→ They communicate tradeoffs clearly — upward, downward, sideways

The engineers getting promoted aren't 10x more productive.
They're 10x more legible to the people around them.

What's one skill outside of coding that would make the biggest difference in your career this year?`,

`The career advice that actually works is never the advice that feels safe.

${title}.

${desc}

What I've seen consistently across hundreds of engineering careers:

The people who grow fastest aren't the ones who execute the best.
They're the ones who make their thinking visible — in PRs, in meetings, in documentation.

Execution is hard to see. Thinking is impossible to ignore.

The best career move you can make right now isn't learning a new framework.
It's making your judgment legible to the people who can accelerate your career.

What's one way you could make your thinking more visible this week?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    // AI/tech authority (models, architecture, frameworks)
    const t = [
`Most teams are reacting to this.
The ones pulling ahead are designing for it.

${title}.

${desc}

Think about the timeline:

Six months ago this was an edge case.
Today it's table stakes.
In six months, teams without it will be explaining why to their boards.

The difference isn't budget or headcount.
It's whether they updated their priors when the evidence changed.

What's the one assumption in your current stack this invalidates?`,

`The gap isn't talent.
The gap is timing.

${title}.

${desc}

The teams that will look smart in 18 months aren't the most resourced.
They're the ones who rearchitected when the capability changed — not after everyone else did.

What actually shifted:
→ The performance floor moved — unreliable use cases are now production-ready
→ The cost curve dropped faster than most financial models assumed
→ Teams who moved at "early majority" are now competing with "early adopters" who have 12 months of learnings

Is your team building on today's capabilities — or last year's constraints?`
    ];
    return `${t[day % t.length]}\n\n${tags}`;
  }

  if(style === 'educational'){

    if(isLeadership && !isGenAI){
      const t = [
`The research on team performance is consistent.
Most managers are acting on intuition instead.

${title}.

${desc}

Three findings that should change how you run your team:

1. Psychological safety predicts innovation output better than any other measured factor
2. Leaders who share uncertainty openly get higher-quality information from their teams
3. Weekly 1:1s focused on blockers — not status updates — reduce attrition by 30%

None of this is complicated.
Almost nobody does all three consistently.

Which one would make the biggest difference in your team right now?`,

`Nobody teaches leaders how to communicate during uncertainty.
Here's what the research actually shows works.

${title}.

${desc}

Leaders whose teams perform best in uncertain times do three things differently:

→ They separate facts from assumptions — explicitly, out loud, in every key meeting
→ They ask "what am I missing?" before finalizing decisions
→ They share bad news faster than good news — because delay costs more than discomfort

The goal isn't to have all the answers.
The goal is to create an environment where the right questions surface quickly.

What's a piece of bad news your team needs to hear from you sooner?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isProduct){
      const t = [
`Nobody teaches product teams how to find the right problem.
They just say "talk to users" and hope for the best.

${title}.

${desc}

Here's what "talk to users" actually means in practice:

→ Ask about their last frustrating experience — not what features they want
→ Look for the problem behind the problem they describe first
→ Find the person who would pay today, not "someday when it has X"

Most teams do interviews. Very few do this.
The ones that do find their real customer 3x faster.

Which of these is missing from your current discovery process?`,

`The product metrics most teams track are the wrong ones.
Here's what actually predicts long-term retention.

${title}.

${desc}

Three metrics that separate growing products from stalling ones:

1. Time to first value — not time to first signup (very different things)
2. Session depth on day 7 — not day 1 activation (anyone can optimize onboarding)
3. Voluntary referral rate — not NPS (people lie on surveys, they don't lie with referrals)

The metric you optimize for shapes the product you build.

Which metric is quietly misleading your team's decisions right now?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isCareer){
      const t = [
`The most valuable skill in tech right now isn't a programming language.
It's knowing which problems are actually worth solving.

${title}.

${desc}

Before your next sprint, ask three questions:

1. Is this the most important problem right now — or just the most visible?
2. What breaks if we solve this the wrong way?
3. Who is the specific person who genuinely wins if we get this exactly right?

The answers will change what you build.
Almost nobody asks all three before writing the first line of code.

Which question does your team consistently skip?`,

`Great engineers and average engineers use the same tools.
They ask completely different questions.

${title}.

${desc}

The question average engineers ask: "How do I build this?"
The question great engineers ask first: "Should we build this at all?"

Then: "What does done actually look like for the person using this?"
Then: "What's the failure mode we haven't thought through yet?"

Those three questions change everything about execution.

Which question are you skipping most often right now?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    // AI educational
    const t = [
`Most AI projects don't fail because of bad models.
They fail because nobody defined what "good" actually looks like.

${title}.

${desc}

The mental model that changes everything:

Build your evaluation before you build your pipeline.
Know what "correct" means before you optimize for it.
Define your failure modes before they define your post-mortem.

Here's the breakdown:
→ Without evals → guessing if it works
→ Basic evals → know when it breaks
→ Good evals → improve systematically, ship with confidence

The teams at level 3 aren't smarter. They just started with evals and built backwards.

Which level is your team at right now?`,

`The difference between an AI demo and an AI product is one thing.
Not the model. Not the infra. Evals.

${title}.

${desc}

Three things most teams get wrong when shipping AI:

1. Adopt before defining what "success" means for their specific use case
2. Benchmark on the wrong task and reach the wrong conclusion
3. Ship before deliberately finding the failure mode

The teams doing this well inverted all three.
Start with where it breaks. Build backwards from there.

What's the failure mode in your current AI feature you haven't tested yet?`
    ];
    return `${t[day % t.length]}\n\n${tags}`;
  }

  if(style === 'opinion'){

    if(isLeadership && !isGenAI){
      const t = [
`Hot take: most leadership development programs are making leaders worse.
Not better. Actively worse.

${title}.

${desc}

They teach frameworks designed for stable environments.
But stable environments are the exception now, not the rule.

The leaders who actually perform in uncertainty share one trait:
They're more comfortable saying "I don't know, here's what we're betting on" than reciting any framework they were taught.

Confidence isn't the edge anymore. Clarity is.

What's something your team needs you to be more honest about right now?`,

`Unpopular opinion: psychological safety isn't a "culture initiative."
It's the most underinvested performance lever in most organizations.

${title}.

${desc}

The data is unambiguous. Teams with high psychological safety outperform on every dimension:
innovation output, retention, speed of problem-solving, quality of decisions.

But most organizations still treat it as separate from performance management.
That's the mistake.

Safety isn't opposed to accountability.
Safety is what makes honest accountability possible in the first place.

What would your team say if they felt completely safe to say it?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isProduct){
      const t = [
`Hot take: "product-market fit" is the most misused phrase in tech.
Here's what it actually means.

${title}.

${desc}

PMF isn't a metric. It's a moment.
One specific person who cannot imagine going back to life without your product.

Not "a lot of people kind of like it."
Not "retention improved last quarter."
One person. Cannot imagine going back.

If you can't name that person right now — you're still searching.
And that's okay. But stop calling the search "PMF."

Disagree? Tell me where this breaks.`,

`Unpopular opinion: most startups scale too early.
Not too slowly. Too early.

${title}.

${desc}

Scaling before you've solved the core problem doesn't accelerate growth.
It accelerates the discovery of every crack in your foundation — at 10x the cost.

The best time to scale is when your best users are pulling you forward.
Not when your investors are pushing you forward.

Those are very different forces.
One is sustainable. One is expensive.

How do you know which one is actually driving your growth right now?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    if(isCareer){
      const t = [
`Hot take: most "learn to code" advice is optimizing for the wrong outcome.
The bottleneck isn't coding. It's judgment.

${title}.

${desc}

The engineers who advance fastest aren't the ones who code the most.
They're the ones who make the fewest expensive mistakes.

Expensive mistakes come from:
→ Solving the wrong problem well
→ Building before understanding the failure mode
→ Optimizing for what's measurable, not what matters

You can learn syntax in weeks.
Judgment takes years — unless you're deliberate about building it.

What's the most expensive mistake you've made in the last year, and what did it teach you?`,

`Unpopular opinion: your GitHub commit history is the least interesting thing about you as an engineer.

${title}.

${desc}

The engineers who get the best opportunities share something more important:
They can explain why they made the decisions they made.

Not just what they built. Why they built it that way.
What tradeoffs they considered. What they'd do differently.

That's what separates candidates in every interview that matters.

When was the last time you wrote down the reasoning behind a technical decision — not just the decision itself?`
      ];
      return `${t[day % t.length]}\n\n${tags}`;
    }

    // AI opinion
    const t = [
`Hot take: most AI strategies aren't AI strategies.
They're "we added AI to our existing strategy" strategies.

${title}.

${desc}

The teams winning with AI didn't bolt it on.
They redesigned from the constraint up — asking what becomes possible, not what becomes faster.

Faster is a feature.
Possible is a business model.

One is incremental. The other is existential.

Is your AI strategy about going 20% faster — or doing something that wasn't possible before?`,

`Unpopular opinion: the AI arms race is making most teams worse.
Not better. Actually worse.

${title}.

${desc}

When everyone moves fast, the advantage goes to whoever moves clearly.
Speed without clarity is just expensive confusion at scale.

Most AI initiatives right now are:
→ Measuring adoption, not outcomes
→ Optimizing for demos, not for users who depend on the product
→ Moving fast in directions nobody has fully thought through

The teams that will look smart in 2027 are slowing down long enough to ask:
"What are we actually trying to accomplish — and how will we know if we got there?"

Is your team moving fast, or moving clearly?`
    ];
    return `${t[day % t.length]}\n\n${tags}`;
  }

  if(style === 'story'){
    const devNames = ['Marcus','Priya','Alex','Jordan','Sana','Ryo','Leila','Dev'];
    const name     = devNames[day % devNames.length];

    const aiT = [
`A developer named ${name} just shared something that stopped my scroll.

${title}.

${desc}

Just a year ago most people were still using AI like a better Google.
Now we're watching ${name} and builders like them ship things that would have required a full team 18 months ago.

The speed of what's being built right now is honestly hard to process.

We might actually be cooked — in the best possible way.`,

`${name} posted a demo this week and I haven't been able to stop thinking about it.

${title}.

${desc}

Six months ago this was a research paper.
Three months ago it was a closed beta 200 people had access to.
This week ${name} built it over a weekend and open sourced it.

The gap between "frontier AI research" and "anyone can build this on a Saturday" has never been smaller.
And it's still shrinking.`,

`I saw ${name}'s post this week and I'm still processing it.

${title}.

${desc}

A year ago we were impressed when AI could write a decent email.
Now we're watching individual developers ship things that used to require entire teams, months, and millions in infrastructure.

The compounding is real. And it's not slowing down.

What are you building today that only became possible in the last 6 months?`,

`${name} just quietly dropped something the whole industry should be paying attention to.

${title}.

${desc}

The thing that gets me isn't the technology itself.
It's the timeline.

18 months ago: research lab, 50 people.
6 months ago: YC startup, $5M raised.
This week: ${name}, solo, weekend project, open sourced.

That compression is the actual story.

We might actually be cooked.`,
    ];

    const productT = [
`A founder named ${name} shared their pivot story this week.
One line stopped me completely.

${title}.

${desc}

"We had 10,000 users and zero product-market fit.
So we deleted everything except what our 10 best users used every single week.
Six months later: 1,000 users, profitable, best retention we'd ever seen."

Less is almost always the move.
Almost nobody is willing to make it until they have no other choice.

What would you cut if you could only keep what your best users use every week?`,

`${name} posted a teardown this week that I keep coming back to.

${title}.

${desc}

They tried 4 different GTM strategies in 18 months. None worked.
Then they stopped trying to reach everyone and asked one question:
"Who is the one person whose life we completely change?"

Found her. Built for her specifically. She told 10 people.
Those 10 told 100.

The distribution strategy was never the problem.
The specificity was.

Who is your "one person"?`,
    ];

    const leaderT = [
`A manager named ${name} shared something in a thread this week.
I've been thinking about it since.

${title}.

${desc}

They changed one thing about their weekly team meeting:
They started it by asking "What's something you're uncertain about that you haven't said out loud yet?"

Within a month, three process problems surfaced that had been silently slowing the team for quarters.

The information was always there.
Nobody felt safe enough to say it.

What question could you ask your team this week that would surface what's not being said?`,
    ];

    const careerT = [
`A senior engineer named ${name} shared their career inflection point this week.
It wasn't what I expected.

${title}.

${desc}

${name} had been a strong IC for 5 years. Great execution. Nearly invisible in decisions.

The shift: they started writing down the reasoning behind every major technical call.
Not just the decision. The why.

Within 6 months: two promotions.

The work hadn't changed.
The legibility of their thinking had.

When was the last time you documented not just what you built — but why?`,
    ];

    const t = isGenAI ? aiT
      : isProduct ? productT
      : (isLeadership && !isGenAI) ? leaderT
      : isCareer ? careerT
      : aiT;

    return `${t[day % t.length]}\n\n${tags}`;
  }

  return `${title}\n\n${desc}\n\nThe ceiling keeps moving.\n\n${tags}`;
}

// ── POST TO LINKEDIN ──────────────────────────────────────────────────────────
function postToLinkedIn(text) {
  return new Promise((resolve, reject) => {
    if (!LI_TOKEN) {
      reject(new Error('LI_TOKEN secret not set! Go to GitHub → Settings → Secrets → New secret'));
      return;
    }
    const body = JSON.stringify({
      author: LI_URN,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: 'NONE',
        },
      },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    });
    const options = {
      hostname: 'api.linkedin.com',
      path:     '/v2/ugcPosts',
      method:   'POST',
      headers: {
        'Authorization':             `Bearer ${LI_TOKEN}`,
        'Content-Type':              'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Length':            Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) resolve({ success: true, status: res.statusCode });
        else reject(new Error(`LinkedIn API error ${res.statusCode}: ${data}`));
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 LinkedIn Auto Post starting...');
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`📰 Article: ${article.title}`);
  console.log(`🎨 Style: ${style}`);
  console.log(`👤 URN: ${LI_URN}`);

  const postText = generatePost(article, style);
  console.log('\n📝 Post preview:');
  console.log('─'.repeat(60));
  console.log(postText);
  console.log('─'.repeat(60));

  try {
    const result = await postToLinkedIn(postText);
    console.log('\n✅ Posted successfully!', result);
  } catch (err) {
    console.error('\n❌ Failed to post:', err.message);
    process.exit(1);
  }
}

main();
