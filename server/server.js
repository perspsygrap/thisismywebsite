// server.js
const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Cloudinary 설정
cloudinary.config({
  cloud_name: "db4kzelqm",
  api_key: "969726697988918",
  api_secret: "nczwrESWt9-4ftaGKZjNd_Wl1TM",
});

// Cloudinary Storage (이미지, GIF, 동영상)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let resource_type = "image";
    if (file.mimetype.startsWith("video/")) resource_type = "video";
    if (file.mimetype === "image/gif") resource_type = "image";
    return {
      folder: "my-blog",
      resource_type: resource_type,
    };
  },
});

const upload = multer({ storage });

// ----------------- 임시 DB -----------------
let posts = [];
let comments = {};
let postId = 1;
let commentId = 1;

// ----------------- 업로드 -----------------
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: req.file.path, resource_type: req.file.mimetype });
  } catch (err) {
    console.error("파일 업로드 중 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// ----------------- 글 작성 -----------------
app.post("/posts", (req, res) => {
  const { title, content, category } = req.body;

  const newPost = {
    id: postId++,
    title,
    content,
    category: category || "match", // 기본 match
  };

  posts.push(newPost);
  comments[newPost.id] = [];

  res.json({ success: true, post: newPost });
});

// ----------------- 글 삭제 -----------------
app.delete("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  posts = posts.filter((p) => p.id !== id);
  delete comments[id];
  res.json({ success: true });
});

// ----------------- 글 목록 (카테고리 필터 추가) -----------------
app.get("/posts", (req, res) => {
  const category = req.query.category;

  let result = posts;

  if (category) {
    result = result.filter((p) => (p.category || "match") === category);
  }

  res.json(result);
});

// ----------------- 글 상세 -----------------
app.get("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  const post = posts.find((p) => p.id === id);

  res.json({
    post,
    comments: comments[id] || [],
  });
});

// ----------------- 댓글 작성 -----------------
app.post("/posts/:id/comments", (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body;

  const newComment = { id: commentId++, content };

  comments[id].push(newComment);

  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
