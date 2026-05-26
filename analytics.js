class Analytics {
  constructor() {
    this.stats = null;
  }

  async init() {
    try {
      const resp = await fetch('stats.json?' + Date.now());
      if (resp.ok) {
        this.stats = await resp.json();
        this.renderStats();
      }
    } catch (e) {
      console.warn('Failed to load analytics:', e);
    }
  }

  async trackVisit() {
    if (!this.stats) return;
    
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const token = sessionStorage.getItem('github_token');
      if (!token) return;

      const fileUrl = 'https://api.github.com/repos/7abian/7abian.github.io/contents/stats.json';
      const resp = await fetch(fileUrl, { headers: { 'Authorization': 'token ' + token } });
      if (!resp.ok) return;
      
      const data = await resp.json();
      let stats = JSON.parse(decodeURIComponent(escape(atob(data.content))));
      
      stats.total = (stats.total || 0) + 1;
      stats.today = (stats.today || 0) + 1;
      stats.daily[today] = (stats.daily[today] || 0) + 1;
      stats.articles[path] = (stats.articles[path] || 0) + 1;
      stats.updated = new Date().toISOString();
      
      await fetch(fileUrl, {
        method: 'PUT',
        headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Update stats: ' + today,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(stats, null, 2)))),
          sha: data.sha,
          branch: 'main'
        })
      });
      
      this.stats = stats;
      this.renderStats();
    } catch (e) {
      console.warn('Failed to track visit:', e);
    }
  }

  renderStats() {
    this.renderTotalVisits();
    this.renderTodayVisits();
    this.renderWeeklyVisits();
    this.renderArticlesList();
    this.renderDailyChart();
  }

  renderTotalVisits() {
    const el = document.getElementById('stats-total');
    if (el && this.stats) {
      el.textContent = this.formatNumber(this.stats.total);
    }
  }

  renderTodayVisits() {
    const el = document.getElementById('stats-today');
    if (el && this.stats) {
      el.textContent = this.formatNumber(this.stats.today);
    }
  }

  renderWeeklyVisits() {
    const el = document.getElementById('stats-week');
    if (el && this.stats) {
      el.textContent = this.formatNumber(this.getWeeklyStats());
    }
  }

  renderArticlesList() {
    const container = document.getElementById('articles-list');
    if (!container || !this.stats?.articles) return;
    
    const articles = Object.entries(this.stats.articles)
      .map(([file, views]) => ({ file, views }))
      .sort((a, b) => b.views - a.views);
    
    container.innerHTML = articles.map((article, index) => `
      <div class="article-row">
        <span style="margin-right:0.75rem;color:var(--muted)">${index + 1}.</span>
        <span class="article-title">${article.file}</span>
        <span class="article-views">${this.formatNumber(article.views)} 次</span>
      </div>
    `).join('');
  }

  renderDailyChart() {
    const canvas = document.getElementById('stats-chart');
    if (!canvas || !this.stats?.daily) return;
    
    const ctx = canvas.getContext('2d');
    const data = Object.entries(this.stats.daily)
      .slice(-14)
      .map(([date, count]) => ({ date, count }));
    
    if (data.length < 2) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 25;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    ctx.clearRect(0, 0, width, height);
    
    const maxCount = Math.max(...data.map(d => d.count), 1);
    const stepX = chartWidth / (data.length - 1);
    
    ctx.beginPath();
    ctx.moveTo(padding, height - padding - (data[0].count / maxCount) * chartHeight);
    
    data.forEach((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (d.count / maxCount) * chartHeight;
      ctx.lineTo(x, y);
    });
    
    ctx.strokeStyle = '#e07b58';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    
    ctx.lineTo(padding + (data.length - 1) * stepX, height - padding);
    ctx.lineTo(padding, height - padding);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, 'rgba(224, 123, 88, 0.3)');
    gradient.addColorStop(1, 'rgba(224, 123, 88, 0)');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    data.forEach((d, i) => {
      const x = padding + i * stepX;
      const y = height - padding - (d.count / maxCount) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#e07b58';
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(224, 123, 88, 0.3)';
      ctx.stroke();
    });
    
    ctx.fillStyle = 'rgba(240, 237, 232, 0.5)';
    ctx.font = '11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    
    data.forEach((d, i) => {
      if (i % 2 === 0) {
        const x = padding + i * stepX;
        const dateStr = d.date.slice(5);
        ctx.fillText(dateStr, x, height - 8);
      }
    });
  }

  formatNumber(num) {
    if (num >= 10000) {
      return (num / 10000).toFixed(1) + 'w';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  }

  getWeeklyStats() {
    if (!this.stats?.daily) return 0;
    
    const today = new Date();
    let total = 0;
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      total += this.stats.daily[dateStr] || 0;
    }
    
    return total;
  }
}