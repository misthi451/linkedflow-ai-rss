const express = require("express");
const rssHandler = require("./rss");
const postHandler = require("./api-post");
const app = express();
app.use(express.json());
app.get("/api/rss", (req, res) => rssHandler(req, res));
app.post("/api/post", (req, res) => postHandler(req, res));
app.listen(3000, () => console.log("Server running on port 3000"));
