// api/rss.js — RSS Feed Fetcher (no CORS issues)
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { url, count = 5 } = req.query;
  if (!url) return res.status(400).json({ error: "RSS URL required" });

  try {
    // Fetch RSS directly (no CORS on server side)
    const response = await fetch(url, {
      headers: { "User-Agent": "LinkedFlow-RSS-Reader/1.0" }
    });
    const xml = await response.text();

    // Parse RSS XML manually
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && items.length < count) {
      const item = match[1];
      const getTag = (tag) => {
        const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>|<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return m ? (m[1] || m[2] || "").trim() : "";
      };
      items.push({
        title:       getTag("title"),
        description: getTag("description").replace(/<[^>]+>/g, "").substring(0, 400),
        link:        getTag("link"),
        pubDate:     getTag("pubDate")
      });
    }

    return res.status(200).json({ success: true, items });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
