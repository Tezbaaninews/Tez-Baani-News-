
(() => {
  "use strict";

  const config = window.TEZ_CONFIG || {};
  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const message = $("msg");
  const newsGrid = $("newsGrid");

  // Check required website elements
  if (!message || !newsGrid) {
    console.error(
      "Required elements not found: msg or newsGrid. Check index.html."
    );
    return;
  }

  // Footer year
  if ($("year")) {
    $("year").textContent = new Date().getFullYear();
  }

  // Mobile category menu
  if ($("menuToggle") && $("cats")) {
    $("menuToggle").onclick = () => {
      $("cats").classList.toggle("open");
    };
  }

  // Social media links
  const socialLabels = {
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    whatsapp: "WhatsApp"
  };

  const socialLinks = Object.entries(config.SOCIAL_URLS || {})
    .filter(([key, url]) =>
      typeof url === "string" &&
      url.trim() !== "" &&
      !url.startsWith("PASTE_") &&
      ["http://", "https://"].some((prefix) => url.startsWith(prefix))
    )
    .map(([key, url]) => `
      <a
        href="${escapeHTML(url)}"
        target="_blank"
        rel="noopener noreferrer"
      >${escapeHTML(socialLabels[key] || key)}</a>
    `)
    .join("");

  if ($("social")) $("social").innerHTML = socialLinks;
  if ($("social2")) $("social2").innerHTML = socialLinks;

  let posts = [];
  let activeCategory = "";

  // Render news articles
  function renderNews() {
    const filteredPosts = posts.filter((post) =>
      !activeCategory || post.category === activeCategory
    );

    const filterLabel = $("filterLabel");
    if (filterLabel) {
      filterLabel.textContent = activeCategory || "All News";
    }

    if (filteredPosts.length === 0) {
      newsGrid.innerHTML = `
        <div class="empty">
          No published news found in this category.
        </div>
      `;
    } else {
      newsGrid.innerHTML = filteredPosts.map((post) => {
        const title = escapeHTML(post.title || "Untitled News");
        const category = escapeHTML(post.category || "News");
        const author = escapeHTML(post.author || "Tez Baani News");
        const summary = escapeHTML(
          post.summary ||
          String(post.body || "").slice(0, 130)
        );
        const imageAlt = escapeHTML(post.image_alt || post.title || "News Image");
        const imageUrl = post.image_url
          ? escapeHTML(post.image_url)
          : "";

        const dateValue = post.published_at || post.created_at;
        const date = dateValue && !Number.isNaN(Date.parse(dateValue))
          ? new Date(dateValue).toLocaleDateString("en-IN")
          : "";

        // Use the article slug when available; otherwise use its ID.
        const articleIdentifier = post.slug || post.id || "";
        const articleUrl =
          "article.html?slug=" + encodeURIComponent(articleIdentifier);

        return `
          <article class="card">
            ${
              imageUrl
                ? `<img
                    loading="lazy"
                    src="${imageUrl}"
                    alt="${imageAlt}"
                  >`
                : `<div class="placeholder">TEZ BAANI NEWS</div>`
            }

            <div class="cardbody">
              <span class="tag">${category}</span>
              <h3>
                <a href="${articleUrl}">${title}</a>
              </h3>
              <p>${summary}</p>
              <div class="meta">
                <span>${author}</span>
                <span>${escapeHTML(date)}</span>
              </div>
            </div>
          </article>
        `;
      }).join("");
    }

    // Breaking News ticker
    const breakingNews = posts.find(
      (post) => post.category === "Breaking News"
    );

    if ($("ticker")) {
      $("ticker").textContent = breakingNews
        ? breakingNews.title
        : "Tez Baani News — Latest Updates";
    }
  }

  // Category filters
  document.querySelectorAll("[data-cat]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activeCategory = link.dataset.cat || "";
      renderNews();

      if ($("cats")) $("cats").classList.remove("open");
    });
  });

  // Validate Supabase configuration
  const supabaseURL = config.SUPABASE_URL;
  const supabaseKey = config.SUPABASE_ANON_KEY;

  if (
    !supabaseURL ||
    !supabaseKey ||
    supabaseURL.includes("PASTE_") ||
    supabaseKey.includes("PASTE_") ||
    !window.supabase ||
    typeof window.supabase.createClient !== "function"
  ) {
    message.textContent =
      "Supabase setup is incomplete. Check config.js and the Supabase library.";
    console.error("Supabase configuration or library is missing.");
    return;
  }

  message.textContent = "Loading news...";

  // Connect to Supabase and fetch published news
  const database = window.supabase.createClient(
    supabaseURL,
    supabaseKey
  );

  database
    .from("news")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(50)
    .then(({ data, error }) => {
      if (error) {
        console.error("Supabase news loading error:", error);
        message.textContent =
          "News loading failed: " + error.message;
        return;
      }

      posts = data || [];
      message.textContent = "";
      renderNews();
    })
    .catch((error) => {
      console.error("Unexpected news loading error:", error);
      message.textContent =
        "Unable to connect to the news database. Please try again.";
    });
})();
