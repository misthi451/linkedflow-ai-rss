# LinkedFlow AI — Backend Server

Auto LinkedIn poster backend. Deploy on Vercel in 5 minutes.

## APIs

| Endpoint | Method | Description |
|---|---|---|
| `/api/post` | POST | Post directly to LinkedIn |
| `/api/rss` | GET | Fetch RSS feed (no CORS) |
| `/api/schedule` | POST | Auto fetch + post |

## Deploy on Vercel (5 steps)

### Step 1 — GitHub pe upload karo
1. github.com → New Repository → `linkedflow-backend`
2. Yeh folder ke saare files upload karo

### Step 2 — Vercel pe deploy karo
1. vercel.com → Login with GitHub
2. "Add New Project" → linkedflow-backend select karo
3. "Deploy" dabao

### Step 3 — URL milega
```
https://linkedflow-backend-xxx.vercel.app
```

### Step 4 — Website mein URL add karo
LinkedFlow AI website mein backend URL paste karo

### Step 5 — Done!
Ab har 5 min mein automatic LinkedIn post hogi ✅

## API Usage

### Post to LinkedIn
```
POST /api/post
{
  "token": "AQV...",
  "personUrn": "urn:li:person:123",
  "text": "Your post content here"
}
```

### Fetch RSS
```
GET /api/rss?url=https://techcrunch.com/feed/&count=5
```

### Auto Schedule Post
```
POST /api/schedule
{
  "token": "AQV...",
  "personUrn": "urn:li:person:123",
  "feedUrl": "https://techcrunch.com/feed/",
  "postStyle": "authority"
}
```
