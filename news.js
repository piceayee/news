const proxy = "https://api.allorigins.win/raw?url=";
const feeds = [
  { name: 'PTS 新聞', url: 'https://news.pts.org.tw/xml/newsfeed.xml' },
  { name: 'TTV 新聞', url: 'https://www.ttv.com.tw/rss/RSSHandler.ashx?d=news' },
  { name: '中央社國際', url: proxy + encodeURIComponent('https://feeds.feedburner.com/rsscna/intworld') },
  { name: '上下游新聞', url: 'https://www.newsmarket.com.tw/feed/atom/' }
];

// 初始化
document.addEventListener("DOMContentLoaded", () => {
  renderNews();
  renderFavorites();
});

// 抓取 RSS
async function fetchFeed(feed) {
  const res = await fetch(`https://api.allorigins.online/raw?url=${encodeURIComponent(feed.url)}`);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const items = xml.querySelectorAll('item, entry');

  return Array.from(items).slice(0, 15).map(item => {
    const title = item.querySelector('title')?.textContent.trim();
    const link = item.querySelector('link')?.textContent || item.querySelector('link')?.getAttribute('href');
    const pubDateRaw = item.querySelector('pubDate')?.textContent ||
                       item.querySelector('updated')?.textContent ||
                       item.querySelector('published')?.textContent || '';
    const pubDate = formatDate(pubDateRaw);

    return { title, link, pubDate, source: feed.name };
  });
}

// 時間格式轉換
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

// 渲染新聞
async function renderNews() {
  const allNews = await Promise.all(feeds.map(fetchFeed));
  const newsList = document.getElementById('news-list');
  newsList.innerHTML = '';

  allNews.flat().forEach(n => {
    const card = document.createElement('div');
    card.className = 'news-card';
    card.innerHTML = `
      <a href="${n.link}" target="_blank" class="news-title">[${n.source}] ${n.title}</a>
      <div class="news-meta">${n.pubDate}</div>
      ${n.img ? `<img src="${n.img}" class="news-img">` : ''}
      <button class="favorite-btn" onclick="addFavorite('${encodeURIComponent(JSON.stringify(n))}')">收藏</button>
    `;
    newsList.appendChild(card);
  });
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
      <a href="${f.link}" target="_blank" class="news-title">[${f.source}] ${f.title}</a>
      <div class="news-meta">${f.pubDate}</div>
      ${f.img ? `<img src="${f.img}" class="news-img">` : ''}
    `;
    favoritesList.appendChild(card);
  });
}
