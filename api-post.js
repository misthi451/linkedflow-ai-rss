const https = require('https');

module.exports = function(req, res) {
  const { token, personUrn, text } = req.body;
  if (!token || !personUrn || !text) {
    return res.status(400).json({ error: 'token, personUrn, text required' });
  }
  const body = JSON.stringify({
    author: personUrn,
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
    path: '/v2/ugcPosts',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Length': Buffer.byteLength(body),
    },
  };
  const liReq = https.request(options, (liRes) => {
    let data = '';
    liRes.on('data', chunk => data += chunk);
    liRes.on('end', () => {
      if (liRes.statusCode === 201) res.json({ success: true });
      else res.status(liRes.statusCode).json({ error: data });
    });
  });
  liReq.on('error', (e) => res.status(500).json({ error: e.message }));
  liReq.write(body);
  liReq.end();
};
