document.addEventListener("DOMContentLoaded", () => {
  const feedContainer = document.getElementById("feed");
  const rssFeeds = [
    {
      title: "Webtekno",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.webtekno.com/rss.xml",
    },
    {
      title: "New York Times",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
    },
    {
      title: "OpenAI Blog",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://jamesg.blog/openai.xml",
    },
    {
      title: "Evrim Ağacı",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://evrimagaci.org/rss.xml",
    },
    {
      title: "Technopat",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.technopat.net/feed",
    },
    {
      title: "WIRED",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.wired.com/feed/category/science/latest/rss",
    },
    {
      title: "9to5Mac",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://9to5mac.com/feed",
    },
    {
      title: "The Verge",
      url: "https://api.rss2json.com/v1/api.json?rss_url=http://www.theverge.com/rss/index.xml",
    },
    {
      title: "Apple Newsroom",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.apple.com/newsroom/rss-feed.rss",
    },
    {
      title: "Apple Developer News and Updates",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://developer.apple.com/news/rss/news.rss",
    },
    {
      title: "Formula 1",
      url: "https://api.rss2json.com/v1/api.json?rss_url=https://www.formula1.com/en/latest/all.xml",
    },
  ];
  rssFeeds.forEach((feed) => {
    fetch(feed.url)
      .then((response) => response.json())
      .then((data) => {
        const items = data.items;

        const feedSection = document.createElement("section");
        feedSection.classList.add("feed-section");

        const feedTitle = document.createElement("h2");
        feedTitle.textContent = feed.title;
        feedTitle.classList.add("feed-title");

        feedSection.appendChild(feedTitle);

        items.forEach((item) => {
          const title = item.title;
          const link = item.link;
          const description = item.description;

          const article = document.createElement("article");
          article.classList.add("article");

          const titleLink = document.createElement("a");
          titleLink.href = link;
          titleLink.target = "_blank";
          titleLink.textContent = title;

          const descPara = document.createElement("p");
          descPara.innerHTML = description.replace(/<a[^>]*>|<\/a>/g, "");

          titleLink.addEventListener("click", (event) => {
            event.preventDefault(); // Sayfanın yeniden yüklenmesini engelle
            window.open(link, "_blank"); // Yeni sekmede haberin linkini aç
          });

          const contentContainer = document.createElement("div");
          contentContainer.classList.add("content-container");
          contentContainer.appendChild(titleLink);
          contentContainer.appendChild(descPara);

          article.appendChild(contentContainer);
          feedSection.appendChild(article);
        });

        feedContainer.appendChild(feedSection);
      })
      .catch((error) => {
        console.error(
          `${feed.title} RSS feed çekilirken bir hata oluştu:`,
          error
        );
      });
  });

  // Feedback button click event
  const feedbackButton = document.getElementById("feedback-button");

  feedbackButton.addEventListener("click", () => {
    const subject = encodeURIComponent("Feedback");
    const body = encodeURIComponent("Enter your Feedback message.");

    window.location.href = `mailto:mehmetkahyakas5@gmail.com?subject=${subject}&body=${body}`;
  });
});

const themeToggleButton = document.getElementById("theme-toggle-button");
const body = document.body;

themeToggleButton.addEventListener("click", () => {
  body.classList.toggle("dark-mode");
  if (body.classList.contains("dark-mode")) {
    themeToggleButton.innerHTML = "☀️"; // Güneş emojisi

  } else {
    themeToggleButton.innerHTML = "🌙"; // Ay emojisi
  }
});

const updateList = document.getElementById("update-list");

function addUpdate(updateText) {
  const updateItem = document.createElement("li");
  updateItem.textContent = updateText;
  updateList.appendChild(updateItem);
}

// Yenilikler burada listeye eklenecek
addUpdate("17 ağustos 2023: ");
addUpdate("  Dark mode toggle eklendi.");
addUpdate("  Responsive tasarım güncellendi.");
// Yeni yenilikleri burada ekleyebilirsiniz.
