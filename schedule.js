// api/schedule.js — Auto Scheduler (called by frontend every 5 min)
const fetch = require("node-fetch");

// Store scheduled config in memory (use DB for production)
let schedulerConfig = {};

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET — check status
  if (req.method === "GET") {
    return res.status(200).json({ status: "ok", config: schedulerConfig });
  }

  // POST — run scheduled post
  if (req.method === "POST") {
    const { token, personUrn, feedUrl, postStyle } = req.body || {};

    if (!token || !personUrn || !feedUrl) {
      return res.status(400).json({ error: "token, personUrn, feedUrl required" });
    }

    try {
      // 1. Fetch RSS
      const rssResponse = await fetch(`${req.headers.host ? "https://" + req.headers.host : ""}/api/rss?url=${encodeURIComponent(feedUrl)}&count=5`);
      const rssData = await rssResponse.json();
      const articles = rssData.items || [];

      if (articles.length === 0) {
        return res.status(200).json({ success: false, message: "No articles found" });
      }

      // 2. Pick best article (simple scoring)
      const bestArticle = articles.reduce((best, item) => {
        const score = (item.title?.length || 0) + (item.description?.length || 0);
        return score > (best.score || 0) ? { ...item, score } : best;
      }, {});

      // 3. Generate post (template based)
      const styles = {
        authority: `Here's what most professionals miss about this:\n\n${bestArticle.title}\n\n${bestArticle.description}\n\nThe organizations that adapt early will have a significant advantage.\n\nWhat's your take?\n\n#LinkedIn #Innovation #Tech #Leadership`,
        educational: `📚 Did you know?\n\n${bestArticle.title}\n\n${bestArticle.description}\n\nKey takeaway: Stay informed, stay ahead.\n\nSave this for later! 👇\n\n#Learning #Growth #Tech #Professional`,
        opinion: `Unpopular opinion:\n\n${bestArticle.title}\n\nMost people overlook this completely.\n\n${bestArticle.description}\n\nDo you agree? Comment below 👇\n\n#Opinion #Tech #Innovation #LinkedIn`
      };
      const postText = styles[postStyle] || styles.authority;

      // 4. Post to LinkedIn
      const liResponse = await fetch("https://api.linkedin.com/v2/ugcPosts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0"
        },
        body: JSON.stringify({
          author: personUrn,
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: postText },
              shareMediaCategory: "NONE"
            }
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
          }
        })
      });

      const liData = await liResponse.json();

      if (liResponse.ok) {
        return res.status(200).json({
          success: true,
          postId: liData.id,
          article: bestArticle.title,
          postText
        });
      } else {
        return res.status(400).json({ error: liData.message, details: liData });
      }

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
};
