# 博客部署指南

## 1. 部署到 GitHub Pages

### 步骤 1：创建 GitHub 仓库

```bash
# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit"

# 创建 GitHub 仓库后推送
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### 步骤 2：启用 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 选择 `GitHub Actions`
3. 等待自动部署完成
4. 访问 `https://YOUR_USERNAME.github.io/YOUR_REPO`

## 2. 集成 Supabase 评论系统

### 配置步骤

1. 访问 https://supabase.com/ 创建项目
2. 在 Supabase SQL Editor 中运行 `supabase_comments.sql`
3. 修改 `comments.js` 中的 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY`
4. 每篇文章页面已通过 `<div id="comment-section" data-blog-comments>` 自动加载评论

## 3. 集成 CountAPI 访问统计

### 配置步骤

1. 访问统计基于 https://countapi.mileshilliard.com/
2. 修改 `analytics.js` 和 `utils.js` 中的 namespace（默认 `mrnokk-blog`）
3. 管理后台 `admin.html` 自动展示访问统计面板

## 4. 更新联系信息

修改 index.html 中的联系链接：

```html
<a href="mailto:your-email@example.com">📧 联系我</a>
<a href="https://github.com/YOUR_USERNAME" target="_blank">GitHub</a>
```

## 完成！

部署完成后，你的博客将具备：
- ✅ 自动部署（推送代码即更新）
- ✅ 评论系统（基于 Supabase）
- ✅ 访问统计（CountAPI 实时统计）
- ✅ 搜索和标签过滤
- ✅ 阅读进度条和代码复制
