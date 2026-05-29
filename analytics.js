class Analytics {
  constructor() {
    this.stats = null;
    this.namespace = 'mrnokk-blog';
  }

  async init() {
    await this.loadRealTimeStats();
    this.renderStats();
  }

  async loadRealTimeStats() {
    try {
      const results = await Promise.all([
        fetch(`https://countapi.mileshilliard.com/api/v1/get/${this.namespace}-total`).then(r => r.json()).catch(() => ({ value: 0 })),
        this.fetchTodayCount(),
        this.fetchArticlesStats(),
        this.fetchDailyStats()
      ]);
      
      const total = parseInt(results[0].value) || 0;
      const today = results[1];
      const articles = results[2];
      const daily = results[3];
      const weekly = this.calculateWeekly(daily);
      
      this.stats = { total, today, weekly, articles, daily };
    } catch (e) {
      console.warn('Analytics load error:', e);
      this.stats = { total: 0, today: 0, weekly: 0, articles: {}, daily: {} };
    }
  }

  async fetchTodayCount() {
    const today = new Date().toISOString().split('T')[0];
    try {
      const resp = await fetch(`https://countapi.mileshilliard.com/api/v1/get/${this.namespace}-day-${today}`);
      const data = await resp.json();
      return parseInt(data.value) || 0;
    } catch {
      return 0;
    }
  }

  async fetchDailyStats() {
    const daily = {};
    const promises = [];
    
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      promises.push(
        fetch(`https://countapi.mileshilliard.com/api/v1/get/${this.namespace}-day-${dateStr}`)
          .then(r => r.json())
          .then(data => ({ date: dateStr, count: parseInt(data.value) || 0 }))
          .catch(() => ({ date: dateStr, count: 0 }))
      );
    }
    
    const results = await Promise.all(promises);
    results.forEach(r => { daily[r.date] = r.count; });
    return daily;
  }

  async fetchArticlesStats() {
    const articles = {};
    const articleList = [
      'post-1.html', 'post-2.html', 'post-3.html', 'post-4.html', 'post-5.html',
      'post-1778299395193.html', 'post-1778991110662.html', 
      'post-1779587180030.html', 'post-1779670042468.html'
    ];
    
    const promises = articleList.map(article =>
      fetch(`https://countapi.mileshilliard.com/api/v1/get/${this.namespace}-${article}`)
        .then(r => r.json())
        .then(data => ({ article, views: parseInt(data.value) || 0 }))
        .catch(() => ({ article, views: 0 }))
    );
    
    const results = await Promise.all(promises);
    results.forEach(r => { articles[r.article] = r.views; });
    return articles;
  }

  calculateWeekly(daily) {
    let total = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      total += daily[dateStr] || 0;
    }
    return total;
  }

  async trackVisit() {
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await Promise.all([
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${this.namespace}-total`),
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${this.namespace}-day-${today}`),
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${this.namespace}-${path}`)
      ]);
    } catch (e) {
      console.warn('Failed to track visit:', e);
    }
  }

  static async recordVisit() {
    const namespace = 'mrnokk-blog';
    const path = window.location.pathname.split('/').pop() || 'index.html';
    const today = new Date().toISOString().split('T')[0];
    
    try {
      await Promise.all([
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${namespace}-total`),
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${namespace}-day-${today}`),
        fetch(`https://countapi.mileshilliard.com/api/v1/hit/${namespace}-${path}`)
      ]);
    } catch (e) {
      console.warn('Failed to record visit:', e);
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
      el.textContent = this.formatNumber(this.stats.weekly);
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
}