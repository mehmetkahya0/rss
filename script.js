document.addEventListener("DOMContentLoaded", () => {
  // Multiple CORS proxies with API keys where needed
  const CORS_PROXIES = [
    {
      url: "https://api.rss2json.com/v1/api.json?api_key=YOUR_API_KEY&rss_url=",
      type: "json",
    },
    {
      url: "https://proxy.cors.sh/",
      type: "xml",
      headers: { "x-cors-grida-api-key": "YOUR_API_KEY" },
    },
    {
      url: "https://api.allorigins.win/raw?url=",
      type: "xml",
    },
  ];

  let currentProxyIndex = 0;

  // Improved cache with longer retention
  const feedCache = {
    data: {},
    set: function (url, data) {
      this.data[url] = {
        timestamp: Date.now(),
        content: data,
      };
      // Store in localStorage for persistence
      localStorage.setItem("feedCache", JSON.stringify(this.data));
    },
    get: function (url, ignoreExpiry = false) {
      const cached = this.data[url];
      if (
        cached &&
        (ignoreExpiry || Date.now() - cached.timestamp < 1000 * 60 * 60)
      ) {
        // 1 hour cache
        return cached.content;
      }
      return null;
    },
    load: function () {
      try {
        this.data = JSON.parse(localStorage.getItem("feedCache")) || {};
      } catch (e) {
        this.data = {};
      }
    },
  };

  feedCache.load();

  // Simplified feed list with working URLs
  const feeds = [
    {
      url: "https://www.wired.com/feed/rss",
      category: "tech",
    },
    {
      url: "https://techcrunch.com/feed/",
      category: "tech",
    },
    {
      url: "https://www.theverge.com/rss/index.xml",
      category: "tech",
    },
    {
      url: "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/section/technology/rss.xml",
      category: "tech",
    },
    {
      url: "https://www.apple.com/newsroom/rss-feed.rss",
      category: "tech",
    },
    {
      url: "https://developer.apple.com/news/releases/rss/releases.rss",
      category: "tech",
    },
    {
      url: "https://www.evrimagaci.org/rss.xml",
      category: "science",
    },
    {
      url: "https://9to5mac.com/feed/",
      category: "tech",
    },
    {
      url: "https://www.formula1.com/content/fom-website/en/latest.rss",
      category: "sports",
    },
  ];

  const feedsContainer = document.getElementById("feeds");
  const searchInput = document.getElementById("search");
  const themeToggle = document.getElementById("theme-toggle");

  // Theme handling - this should work on all pages
  const theme = localStorage.getItem("theme") || "light";
  document.body.classList.toggle("dark-theme", theme === "dark");
  if (themeToggle) {
    themeToggle.checked = theme === "dark";
    themeToggle.addEventListener("change", () => {
      document.body.classList.toggle("dark-theme");
      const isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("theme", isDark ? "dark" : "light");
    });
  }

  function sanitizeHTML(html) {
    // Remove all image tags
    html = html.replace(/<img[^>]*>/g, "");
    // Remove any figure tags and their contents
    html = html.replace(/<figure[^>]*>.*?<\/figure>/g, "");
    // Remove any iframe tags
    html = html.replace(/<iframe[^>]*>.*?<\/iframe>/g, "");
    // Remove data attributes and srcset
    html = html.replace(/ data-[^=]*="[^"]*"/g, "");
    html = html.replace(/ srcset="[^"]*"/g, "");
    // Clean up any empty paragraphs or multiple spaces
    html = html.replace(/<p>\s*<\/p>/g, "");
    html = html.replace(/\s+/g, " ");
    return html.trim();
  }

  async function parseXMLFeed(text) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const items = Array.from(xml.querySelectorAll("item, entry"));

    return items.map((item) => ({
      title: item.querySelector("title")?.textContent || "",
      link: item.querySelector("link")?.textContent || "",
      description: sanitizeHTML(
        item.querySelector("description, summary, content\\:encoded")
          ?.textContent || ""
      ),
      date:
        item.querySelector("pubDate, published, updated")?.textContent ||
        new Date().toISOString(),
    }));
  }

  async function fetchWithExponentialBackoff(
    url,
    options = {},
    retries = 3,
    delay = 1000
  ) {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) {
          const text = await response.text();
          try {
            return JSON.parse(text);
          } catch {
            return text;
          }
        }
        if (response.status === 429) {
          const waitTime = delay * Math.pow(2, i);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, delay * Math.pow(2, i))
        );
      }
    }
  }

  async function fetchFeed(feed) {
    const cached = feedCache.get(feed.url);
    if (cached) return cached;

    for (const proxy of CORS_PROXIES) {
      try {
        const response = await fetchWithExponentialBackoff(
          `${proxy.url}${encodeURIComponent(feed.url)}`,
          { headers: proxy.headers }
        );

        const items =
          proxy.type === "json"
            ? response.items || response.entries || []
            : await parseXMLFeed(response);

        const processedItems = items.map((item) => ({
          title: item.title,
          link: item.link || item.url,
          description: sanitizeHTML(
            item.description || item.content || item.summary || ""
          ),
          date: item.pubDate || item.published || item.date,
          category: feed.category,
        }));

        if (processedItems.length > 0) {
          feedCache.set(feed.url, processedItems);
          return processedItems;
        }
      } catch (error) {
        console.warn(`Proxy ${proxy.url} failed:`, error);
        continue;
      }
    }

    // Return cached data if all proxies fail
    return feedCache.get(feed.url, true) || [];
  }

  // Load feeds
  async function loadFeeds() {
    feedsContainer.innerHTML = '<div class="loading">Loading feeds...</div>';

    try {
      const feedPromises = feeds.map((feed) => fetchFeed(feed));

      const allFeeds = await Promise.all(feedPromises);
      const flatFeeds = allFeeds
        .flat()
        .filter((item) => item.title && item.link)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (flatFeeds.length === 0) {
        throw new Error("No feeds available. Please try again later.");
      }

      feedsContainer.innerHTML = "";
      flatFeeds.forEach((item) => {
        feedsContainer.appendChild(createFeedCard(item));
      });
    } catch (error) {
      feedsContainer.innerHTML = `
        <div class="error">
          ${error.message}
          <button onclick="loadFeeds()">Try Again</button>
        </div>`;
      console.error("Error loading feeds:", error);
    }
  }

  function createFeedCard(item) {
    const card = document.createElement("article");
    card.className = "feed-card";
    card.dataset.category = item.category;

    // Extract source from the link
    const getSourceName = (link) => {
      try {
        const url = new URL(link);
        const domain = url.hostname.replace("www.", "");
        // Map common domains to readable names
        const sourceMap = {
          "nytimes.com": "New York Times",
          "wired.com": "WIRED",
          "theverge.com": "The Verge",
          "webtekno.com": "Webtekno",
          "evrimagaci.org": "Evrim Ağacı",
          "9to5mac.com": "9to5Mac",
          "apple.com": "Apple Newsroom",
          "developer.apple.com": "Apple Developer",
          "formula1.com": "Formula 1",
          "feedburner.com": "The Hackers News",
        };
        return (
          sourceMap[domain] ||
          domain.split(".")[0].charAt(0).toUpperCase() +
            domain.split(".")[0].slice(1)
        );
      } catch {
        return "Unknown Source";
      }
    };

    card.innerHTML = `
      <div class="feed-content">
        <h2 class="feed-title">
          <a href="${item.link}" class="feed-link" target="_blank">${
      item.title
    }</a>
        </h2>
        <p>${item.description.substring(0, 150)}...</p>
        <div class="feed-meta">
          <time>${new Date(item.date).toLocaleDateString()}</time>
          <span class="feed-source">${getSourceName(item.link)}</span>
          ${
            item.category
              ? `<span class="feed-category">${item.category}</span>`
              : ""
          }
        </div>
      </div>
    `;

    return card;
  }

  // Only add event listeners if elements exist (main page only)
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase();
      document.querySelectorAll(".feed-card").forEach((card) => {
        const title = card.querySelector(".feed-title").textContent.toLowerCase();
        card.style.display = title.includes(query) ? "block" : "none";
      });
    });
  }

  // Filter functionality - only for main page
  const filterButtons = document.querySelectorAll(".filter-btn[data-category]");
  if (filterButtons.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const category = btn.dataset.category;
        document.querySelectorAll(".feed-card").forEach((card) => {
          card.style.display =
            category === "all" || card.dataset.category === category
              ? "block"
              : "none";
        });
      });
    });
  }

  // Initial load - only if we're on the main page
  if (feedsContainer) {
    loadFeeds();
  }

  // Add this after the DOMContentLoaded event listener
  async function checkSystemStatus() {
    if (!document.getElementById('system-status')) return;

    // Check feed sources
    const feedSourcesEl = document.getElementById('feed-sources');
    feedSourcesEl.innerHTML = feeds.map(feed => `
        <div class="status-item">
            <span>${new URL(feed.url).hostname}</span>
            <span class="status-indicator">Checking...</span>
        </div>
    `).join('');

    // Check each feed source
    const feedItems = feedSourcesEl.querySelectorAll('.status-item');
    for (let i = 0; i < feeds.length; i++) {
        const statusIndicator = feedItems[i].querySelector('.status-indicator');
        try {
            await fetchFeed(feeds[i]);
            statusIndicator.textContent = '✅ Online';
            statusIndicator.style.color = '#166534';
        } catch (error) {
            statusIndicator.textContent = '❌ Offline';
            statusIndicator.style.color = '#991b1b';
        }
    }

    // Check cache status
    const cacheStatusEl = document.getElementById('cache-status');
    const cachedItems = Object.keys(feedCache.data).length;
    cacheStatusEl.innerHTML = `
        <dl>
            <dt>Cached Items:</dt>
            <dd>${cachedItems}</dd>
            <dt>Last Updated:</dt>
            <dd>${cachedItems > 0 ? new Date(Math.max(...Object.values(feedCache.data).map(item => item.timestamp))).toLocaleString() : 'Never'}</dd>
        </dl>
    `;

    // Check CORS proxies
    const proxyStatusEl = document.getElementById('proxy-status');
    proxyStatusEl.innerHTML = CORS_PROXIES.map(proxy => `
        <div class="status-item">
            <span>${new URL(proxy.url).hostname}</span>
            <span class="status-indicator">Checking...</span>
        </div>
    `).join('');

    // Check each proxy
    const proxyItems = proxyStatusEl.querySelectorAll('.status-item');
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        const statusIndicator = proxyItems[i].querySelector('.status-indicator');
        try {
            const response = await fetch(CORS_PROXIES[i].url + encodeURIComponent('https://example.com'), {
                headers: CORS_PROXIES[i].headers
            });
            statusIndicator.textContent = response.ok ? '✅ Online' : '⚠️ Issues';
            statusIndicator.style.color = response.ok ? '#166534' : '#854d0e';
        } catch (error) {
            statusIndicator.textContent = '❌ Offline';
            statusIndicator.style.color = '#991b1b';
        }
    }

    // Update overall system status
    const systemStatusEl = document.getElementById('system-status');
    const isSystemOnline = feedItems.length > 0 && Array.from(feedItems).some(
        item => item.querySelector('.status-indicator').textContent.includes('Online')
    );
    
    systemStatusEl.textContent = isSystemOnline ? '✅ System Online' : '❌ System Offline';
    systemStatusEl.classList.add(isSystemOnline ? 'online' : 'offline');
  }

  // Add this at the end of the DOMContentLoaded event listener
  if (window.location.pathname.includes('status.html')) {
    checkSystemStatus();
    // Refresh status every 5 minutes
    setInterval(checkSystemStatus, 5 * 60 * 1000);
  }
});
