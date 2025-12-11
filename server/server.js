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
    if (file.mimetype === "image/gif") resource_type = "image"; // GIF는 image로 처리
    return {
      folder: "my-blog",
      resource_type: resource_type,
    };
  },
});

const upload = multer({ storage });

// 임시 DB
let posts = [];
let comments = {};
let postId = 1;
let commentId = 1;

// ----------------- 라우트 -----------------

// 파일 업로드 (이미지, GIF, MP4)
app.post("/upload", upload.single("file"), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: req.file.path, resource_type: req.file.mimetype });
  } catch (err) {
    console.error("파일 업로드 중 오류:", err);
    res.status(500).json({ error: err.message });
  }
});

// 글 작성 (파일 URL 포함)
app.post("/posts", (req, res) => {
  const { title, content, category } = req.body;
  const newPost =  { id: postId++, title, content, category: category || "match" };
  posts.push(newPost);
  comments[newPost.id] = [];
  res.json({ success: true });
});

// 글 삭제
app.delete("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  // posts 배열에서 해당 글 제거
  posts = posts.filter((p) => p.id !== id);
  // 댓글도 같이 제거
  delete comments[id];
  res.json({ success: true });
});


// 글 목록
app.get("/posts", (req, res) => {
  const simplePosts = posts.map((p) => ({ id: p.id, title: p.title }));
  res.json(simplePosts);
});

// 글 상세
app.get("/posts/:id", (req, res) => {
  const id = Number(req.params.id);
  const post = posts.find((p) => p.id === id);
  res.json({ post, comments: comments[id] || [] });
});

// 댓글 작성
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
