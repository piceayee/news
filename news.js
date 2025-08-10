const proxy = "https://api.allorigins.win/raw?url=";
const feeds = [
  { name: '公視', url: 'https://news.pts.org.tw/xml/newsfeed.xml' },
  { name: '台視', url: 'https://www.ttv.com.tw/rss/RSSHandler.ashx?d=news' },
  { name: '中央社國際', url: 'https://feeds.feedburner.com/rsscna/intworld' },
  { name: '上下游', url: 'https://www.newsmarket.com.tw/feed/atom/' },
  { name: '環境資訊', url: 'https://e-info.org.tw/yahoo.xml'}
];

let allNewsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadNews();
    renderFavorites();
    analyzeKeywords(); // 頁面載入後自動分析
    setInterval(async () => {
      await loadNews();
      analyzeKeywords(); // 每次更新資料後重新分析
    }, 30 * 60 * 1000);


  // 手動刷新
  document.getElementById('refresh-btn').addEventListener('click', () => {
    location.reload();
  });

  // 回到頂部
  document.getElementById('top-btn').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // 關鍵字分析
  //document.getElementById('analyze-btn').addEventListener('click', analyzeKeywords);
});

async function fetchFeed(feed) {
  try {
    const res = await fetch(proxy + encodeURIComponent(feed.url));
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const items = xml.querySelectorAll('item, entry');

    return Array.from(items).slice(0, 50).map(item => {
      const title = item.querySelector('title')?.textContent.trim();
      const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href');
      const pubDateRaw = item.querySelector('pubDate')?.textContent ||
                         item.querySelector('updated')?.textContent ||
                         item.querySelector('published')?.textContent || '';
      const pubDate = formatDate(pubDateRaw);
      const pubTimestamp = new Date(pubDateRaw).getTime();
      return { title, link, pubDate, pubTimestamp, source: feed.name };
    });
  } catch (err) {
    console.error(`抓取失敗：${feed.name}`, err);
    return [];
  }
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (isNaN(date)) return '';
  const days = ['日','一','二','三','四','五','六'];
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dayName = days[date.getDay()];
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd}（${dayName}）${hh}:${min}`;
}

async function loadNews() {
  const allFeeds = await Promise.all(feeds.map(fetchFeed));
  allNewsData = allFeeds.flat().sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  renderNews(allNewsData);
  updateLastUpdated();
}

function renderNews(newsArray) {
  const newsList = document.getElementById('news-list');
  newsList.innerHTML = '';
  newsArray.forEach(n => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <a href="${n.link}" class="news-title" target="_self">${n.title}</a>
      <div class="news-meta">
        <span class="tag">${n.source}</span>
        ${n.pubDate}
      </div>
      <button class="favorite-btn" onclick="addFavorite('${encodeURIComponent(JSON.stringify(n))}')">收藏</button>
    `;
    newsList.appendChild(card);
  });
}

function updateLastUpdated() {
  const now = new Date();
  document.getElementById('last-updated').textContent =
    `最後更新：${formatDate(now)}`;
}

function filterNews() {
  const keyword = document.getElementById('search-input').value.trim();
  if (!keyword) {
    renderNews(allNewsData);
    return;
  }
  const filtered = allNewsData.filter(n => n.title.includes(keyword));
  renderNews(filtered);
}

// 自動執行關鍵字分析（兩個字以上）
function analyzeKeywords() {
    const counts = {};
    const stopWords = ['的', '是', '了', '在', '與', '和', '及', '或', '而', '也'];
  
    allNewsData.forEach(n => {
      // 取出所有連續 2 個字以上的詞
      const matches = n.title.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g);
      if (matches) {
        matches.forEach(word => {
          if (stopWords.includes(word)) return; // 跳過無意義詞
          counts[word] = (counts[word] || 0) + 1;
        });
      }
    });
  
    // // 排序後取前 7 個，且必須出現至少 2 次
    // const topWords = Object.entries(counts)
    //   .filter(([word, count]) => count >= 2)
    //   .sort((a, b) => b[1] - a[1])
    //   .slice(0, 7);
  
    // const container = document.getElementById('keywords-list');
    // container.innerHTML = '';
    // topWords.forEach(([word, count]) => {
    //   const btn = document.createElement('button');
    //   btn.textContent = `${word} (${count})`;
    //   btn.onclick = () => {
    //     const filtered = allNewsData.filter(n => n.title.includes(word));
    //     renderNews(filtered);
    //   };
    //   container.appendChild(btn);
    // });
  }
  
  

// 收藏功能
function addFavorite(newsEncoded) {
  const news = JSON.parse(decodeURIComponent(newsEncoded));
  let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  if (!favorites.find(f => f.link === news.link)) {
    favorites.push(news);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
  }
}

function renderFavorites() {
  const favoritesList = document.getElementById('favorites-list');
  favoritesList.innerHTML = '';
  const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
  favorites.forEach(f => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <a href="${f.link}" class="news-title" target="_self">${f.title}</a>
      <div class="news-meta">
        <span class="tag">${f.source}</span>
        ${f.pubDate}
      </div>
    `;
    favoritesList.appendChild(card);
  });
}
