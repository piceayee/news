document.addEventListener("DOMContentLoaded", () => {
    const newsContainer = document.getElementById("newsContainer");
    const searchInput = document.getElementById("searchInput");
    const lastUpdatedEl = document.getElementById("lastUpdated");
    const successSourcesEl = document.getElementById("successSources");

    const sources = [
        { name: "公視", url: "https://news.pts.org.tw/xml/newsfeed.xml" },
        { name: "環境資訊", url: "https://e-info.org.tw/yahoo.xml" },
        { name: "台視", url: "https://www.ttv.com.tw/rss/RSSHandler.ashx?d=news" }
    ];

    let allNews = [];
    let successSources = [];

    async function fetchFeed(source, retry = false) {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.url)}?t=${Date.now()}`;

        try {
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const text = await res.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, "text/xml");
            const items = Array.from(xml.querySelectorAll("item"));

            const newsItems = items.map(item => ({
                title: item.querySelector("title")?.textContent || "無標題",
                link: item.querySelector("link")?.textContent || "#",
                pubDate: new Date(item.querySelector("pubDate")?.textContent || Date.now()),
                source: source.name
            }));

            successSources.push(source.name);
            return newsItems;
        } catch (err) {
            console.error(`抓取失敗：${source.name}`, err);
            if (!retry) {
                console.log(`重試中：${source.name}`);
                await new Promise(res => setTimeout(res, 3000));
                return fetchFeed(source, true);
            }
            return [];
        }
    }

    async function loadNews() {
        lastUpdatedEl.textContent = `最後更新時間：${new Date().toLocaleString()}`;
        successSources = [];

        const results = await Promise.all(sources.map(src => fetchFeed(src)));
        allNews = results.flat();

        // 按時間排序
        allNews.sort((a, b) => b.pubDate - a.pubDate);

        renderNews(allNews);
        successSourcesEl.textContent = `成功抓取來源：${successSources.join("、")}`;
    }

    function renderNews(newsList) {
        newsContainer.innerHTML = newsList.map(news => `
            <article>
                <h3><a href="${news.link}" target="_blank">${news.title}</a></h3>
                <p>${news.pubDate.toLocaleString()} | ${news.source}</p>
            </article>
        `).join("");
    }

    searchInput.addEventListener("input", e => {
        const keyword = e.target.value.trim();
        if (!keyword) {
            renderNews(allNews);
            return;
        }
        const filtered = allNews.filter(news =>
            news.title.includes(keyword)
        );
        renderNews(filtered);
    });

    loadNews();
});
