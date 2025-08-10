const proxy = "https://api.allorigins.win/raw?url=";
const feeds = [
  { name: '公視', url: 'https://news.pts.org.tw/xml/newsfeed.xml' },
  { name: '台視', url: 'https://www.ttv.com.tw/rss/RSSHandler.ashx?d=news' },
  { name: '中央社國際', url: 'https://feeds.feedburner.com/rsscna/intworld' },
  { name: '上下游', url: 'https://www.newsmarket.com.tw/feed/atom/' },
  { name: '環境資訊', url: 'https://e-info.org.tw/yahoo.xml' }
];

let allNewsData = [];
let fetchedSources = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadNews();
    renderFavorites();

    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });
    }

    const topBtn = document.getElementById('top-btn');
    if (topBtn) {
        topBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

async function fetchFeed(feed) {
  try {
    const bustUrl = proxy + encodeURIComponent(feed.url) + `?t=${Date.now()}`;
    const res = await fetch(bustUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, 'application/xml');
    const items = xml.querySelectorAll('item, entry');

    fetchedSources.push(feed.name); // 成功的來源

    return Array.from(items).slice(0, 50).map(item => {
      const title = item.querySelector('title')?.textContent.trim() || '無標題';
      const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href') || '#';
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
  fetchedSources = []; // 重置成功來源紀錄
  const allFeeds = await Promise.all(feeds.map(fetchFeed));
  allNewsData = allFeeds.flat().sort((a, b) => b.pubTimestamp - a.pubTimestamp);
  renderNews(allNewsData);
  updateLastUpdated();
  renderFetchedSources();
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

function renderFetchedSources() {
  const container = document.getElementById('fetched-sources');
  if (container) {
    container.textContent = `成功抓取來源：${fetchedSources.join('、') || '無'}`;
  }
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
