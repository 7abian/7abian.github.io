// 阅读进度条
window.addEventListener('scroll', () => {
  const bar = document.getElementById('progress');
  if (!bar) return;
  const doc = document.documentElement;
  bar.style.width = (doc.scrollTop / (doc.scrollHeight - doc.clientHeight) * 100) + '%';
}, { passive: true });

// 代码块复制按钮
document.querySelectorAll('pre').forEach(pre => {
  const wrap = document.createElement('div');
  wrap.className = 'pre-wrap';
  pre.parentNode.insertBefore(wrap, pre);
  wrap.appendChild(pre);
  const btn = document.createElement('button');
  btn.className = 'copy-btn';
  btn.textContent = '复制';
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(pre.querySelector('code')?.innerText || pre.innerText).then(() => {
      btn.textContent = '已复制';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = '复制'; btn.classList.remove('copied'); }, 2000);
    });
  });
  wrap.appendChild(btn);
});

// 管理员身份验证
(async () => {
  const token = localStorage.getItem('github_token');
  if (!token) return;
  try {
    const resp = await fetch('https://api.github.com/user', {
      headers: { 'Authorization': 'token ' + token }
    });
    if (!resp.ok) return;
    const user = await resp.json();
    if (user.login === '7abian') {
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'flex');
    }
  } catch (e) {}
})();

// 删除文章（同时从 index.html 中移除文章卡片）
async function deletePost(fileName) {
  if (!confirm('确定要删除这篇文章吗？此操作不可恢复！')) return;
  try {
    const token = localStorage.getItem('github_token');
    const fileUrl = 'https://api.github.com/repos/7abian/7abian.github.io/contents/' + fileName;
    const resp = await fetch(fileUrl, { headers: { 'Authorization': 'token ' + token } });
    if (!resp.ok) throw new Error('获取文件信息失败');
    const data = await resp.json();
    await fetch(fileUrl, {
      method: 'DELETE',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Delete post: ' + fileName, sha: data.sha, branch: 'main' })
    });
    // 同步从 index.html 中删除对应文章卡片
    try {
      const indexUrl = 'https://api.github.com/repos/7abian/7abian.github.io/contents/index.html';
      const indexResp = await fetch(indexUrl, { headers: { 'Authorization': 'token ' + token } });
      if (indexResp.ok) {
        const indexData = await indexResp.json();
        let indexHTML = decodeURIComponent(escape(atob(indexData.content)));
        const regex = new RegExp('<article[^>]*onclick="location\\\\.href=\\'' + fileName + '\\'"[^>]*>[\\s\\S]*?</article>\\s*', 'g');
        indexHTML = indexHTML.replace(regex, '');
        await fetch(indexUrl, {
          method: 'PUT',
          headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Remove deleted post from index', content: btoa(unescape(encodeURIComponent(indexHTML))), sha: indexData.sha, branch: 'main' })
        });
      }
    } catch (e) {}
    alert('文章已删除');
    window.location.href = 'index.html';
  } catch (e) { alert('删除失败: ' + e.message); }
}
