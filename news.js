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

    setInterval(async () => {
        await loadNews();
    }, 30 * 60 * 1000);

    document.getElementById('refresh-btn').addEventListener('click', () => {
        location.reload();
    });

    document.getElementById('top-btn').addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('search-input').addEventListener('input', filterNews);
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
    const allFeedsPromise = feeds.map(feed => fetchFeed(feed));
    
    const results = await Promise.allSettled(allFeedsPromise);

    const successfulFeeds = [];
    allNewsData = [];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            allNewsData.push(...result.value);
            successfulFeeds.push(feeds[index].name);
        } else {
            console.error(`抓取失敗或無資料：${feeds[index].name}`);
        }
    });

    allNewsData.sort((a, b) => b.pubTimestamp - a.pubTimestamp);
    renderNews(allNewsData);
    updateLastUpdated();
    displayFetchedSources(successfulFeeds);
}

function displayFetchedSources(sources) {
    const container = document.getElementById('fetched-sources');
    container.innerHTML = `已成功連線： ${sources.join('、')}`;
}

let touchStartX = 0;
function addSwipeListeners(card, newsItem) {
    card.addEventListener('touchstart', e => {
        touchStartX = e.touches[0].clientX;
        card.style.transition = 'transform 0s'; // 滑動時禁用過渡效果
    });

    card.addEventListener('touchmove', e => {
        const touchCurrentX = e.touches[0].clientX;
        const diff = touchCurrentX - touchStartX;
        if (diff > 50) { // 右滑超過 50px
            card.style.transform = `translateX(${diff}px)`;
            card.style.opacity = 1 - (diff / 200);
        }
    });

    card.addEventListener('touchend', e => {
        card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out'; // 結束時恢復過渡
        const touchCurrentX = e.changedTouches[0].clientX;
        const diff = touchCurrentX - touchStartX;
        
        if (diff > 100) {
            promptForNote(newsItem);
        }
        card.style.transform = `translateX(0)`;
        card.style.opacity = 1;
    });
}

function promptForNote(newsItem) {
    // 檢查收藏中是否已有這條新聞
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let existingNews = favorites.find(f => f.link === newsItem.link);
    
    const note = prompt(`為 "${newsItem.title}" 撰寫備註：`, existingNews?.note || '');
    if (note !== null) {
        if (existingNews) {
            existingNews.note = note;
        } else {
            existingNews = { ...newsItem, note };
            favorites.push(existingNews);
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
        renderFavorites();
    }
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
                <span class="tag" onclick="filterBySource('${n.source}')">${n.source}</span>
                ${n.pubDate}
            </div>
            <div class="card-buttons">
                <button class="favorite-btn" onclick="addFavorite('${encodeURIComponent(JSON.stringify(n))}')">收藏</button>
            </div>
        `;
        addSwipeListeners(card, n);
        newsList.appendChild(card);
    });
}

function filterBySource(sourceName) {
    const filtered = allNewsData.filter(n => n.source === sourceName);
    renderNews(filtered);

    const newsList = document.getElementById('news-list');
    const allNewsBtn = document.createElement('button');
    allNewsBtn.textContent = '顯示所有新聞';
    allNewsBtn.className = 'filter-reset-btn';
    allNewsBtn.onclick = () => renderNews(allNewsData);
    newsList.prepend(allNewsBtn);
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('last-updated').textContent = `最後更新：${formatDate(now)}`;
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
    
    const favoritesWithNotes = favorites.filter(f => f.note);
    const favoritesWithoutNotes = favorites.filter(f => !f.note);
    
    if (favoritesWithNotes.length > 0) {
        const notesTitle = document.createElement('h2');
        notesTitle.textContent = '我的備註';
        favoritesList.appendChild(notesTitle);
        favoritesWithNotes.forEach(f => {
            const card = document.createElement('div');
            card.className = 'news-card note-card';
            card.innerHTML = `
                <a href="${f.link}" class="news-title" target="_self">${f.title}</a>
                <div class="news-meta">
                    <span class="tag" onclick="filterBySource('${f.source}')">${f.source}</span>
                    ${f.pubDate}
                </div>
                <div class="note-content">備註：${f.note}</div>
                <div class="card-buttons">
                    <button class="favorite-btn" onclick="removeFavorite('${encodeURIComponent(JSON.stringify(f))}')">取消收藏</button>
                    <button class="edit-btn" onclick="promptForNote('${encodeURIComponent(JSON.stringify(f))}')">編輯備註</button>
                </div>
            `;
            favoritesList.appendChild(card);
        });
    }

    if (favoritesWithoutNotes.length > 0) {
        const regularFavTitle = document.createElement('h2');
        regularFavTitle.textContent = '我的收藏';
        favoritesList.appendChild(regularFavTitle);
        favoritesWithoutNotes.forEach(f => {
            const card = document.createElement('div');
            card.className = 'news-card';
            card.innerHTML = `
                <a href="${f.link}" class="news-title" target="_self">${f.title}</a>
                <div class="news-meta">
                    <span class="tag" onclick="filterBySource('${f.source}')">${f.source}</span>
                    ${f.pubDate}
                </div>
                <div class="card-buttons">
                    <button class="favorite-btn" onclick="removeFavorite('${encodeURIComponent(JSON.stringify(f))}')">取消收藏</button>
                    <button class="note-btn" onclick="promptForNote('${encodeURIComponent(JSON.stringify(f))}')">新增備註</button>
                </div>
            `;
            favoritesList.appendChild(card);
        });
    }
}

function removeFavorite(newsEncoded) {
    const news = JSON.parse(decodeURIComponent(newsEncoded));
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    favorites = favorites.filter(f => f.link !== news.link);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderFavorites();
}
