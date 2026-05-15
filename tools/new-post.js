#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const title = process.argv[2];
const tag = process.argv[3] || '技术';

if (!title) {
  console.log('用法: node new-post.js "文章标题" "标签"');
  process.exit(1);
}

const files = fs.readdirSync('.').filter(f => f.match(/^post-\d+\.html$/));
const nextNum = files.length + 1;
const filename = `post-${nextNum}.html`;
const date = new Date().toISOString().split('T')[0];

const template = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} · MRNOKK's Blog</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

<div class="progress-bar" id="progress" aria-hidden="true"></div>

<div class="bg-wrap" aria-hidden="true">
  <div class="bg-orb orb-1"></div>
  <div class="bg-orb orb-2"></div>
  <div class="bg-orb orb-3"></div>
</div>

<header>
  <div class="nav-container">
    <div style="display:flex;gap:1rem">
      <a href="index.html" class="back-btn">← 返回首页</a>
      <div class="admin-only" style="display:none;gap:1rem">
        <a href="admin.html?edit=${filename}" class="back-btn">✏️ 编辑</a>
        <a href="#" onclick="deletePost('${filename}');return false" class="back-btn">🗑️ 删除</a>
      </div>
    </div>
    <a href="index.html" class="logo">
      <img src="images/avatar02.jpg" alt="MRNOKK" class="avatar">
      <span>MRNOKK's Blog</span>
    </a>
  </div>
</header>

<div class="post-wrap">
  <div class="post-hero">
    <div class="post-tag">${tag}</div>
    <h1>${title}</h1>
    <div class="post-info">
      <span>${date}</span>
      <span>阅读约 5 分钟</span>
    </div>
  </div>

  <div class="post-content">
    <p>在这里编写文章内容...</p>
    <h2>章节标题</h2>
    <p>段落内容。</p>
  </div>

  <nav class="post-nav" aria-label="文章导航">
    <a href="post-${nextNum - 1}.html">
      <span class="nav-label">← 上一篇</span>
      <span class="nav-title">上一篇文章</span>
    </a>
    <div></div>
  </nav>
  <div id="comment-section" data-blog-comments data-page-path="${filename.replace('.html','')}"></div>
</div>

<footer>
  <p>© 2026 MRNOKK's Blog · 用 ❤ 与 HTML 编织</p>
</footer>
<script src="comments.js"></script>
<script src="utils.js"></script>
</body>
</html>`;

fs.writeFileSync(filename, template);
console.log(`✅ 创建成功: ${filename}`);
console.log(`📝 请编辑文件内容，然后更新 index.html 添加文章链接`);
