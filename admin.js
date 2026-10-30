
(() => {
  const c = window.TEZ_CONFIG || {};
  const $ = id => document.getElementById(id);

  const ready =
    c.SUPABASE_URL &&
    !c.SUPABASE_URL.includes("PASTE_") &&
    c.SUPABASE_ANON_KEY &&
    !c.SUPABASE_ANON_KEY.includes("PASTE_") &&
    window.supabase;

  const esc = s =>
    String(s ?? "").replace(/[&<>"']/g, x => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[x]));

  if (!ready) {
    $("setup").textContent =
      "Setup required: Add your Supabase URL and publishable/anon key in config.js. See README.md.";

    $("login").onsubmit = e => {
      e.preventDefault();
      $("authStatus").textContent =
        "Please complete the Supabase setup first.";
    };
    return;
  }

  const db = window.supabase.createClient(
    c.SUPABASE_URL,
    c.SUPABASE_ANON_KEY
  );

  let user = null;
  let oldImage = null;

  const slugify = s =>
    s.toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "news";

  async function check() {
    const {
      data: { user: u }
    } = await db.auth.getUser();

    user = u;

    if (!u) {
      $("editor").classList.add("hidden");
      $("authStatus").textContent = "Please log in.";
      return;
    }

    const { data, error } = await db
      .from("profiles")
      .select("role")
      .eq("id", u.id)
      .maybeSingle();

    if (error || data?.role !== "admin") {
      $("editor").classList.add("hidden");
      $("authStatus").textContent =
        "This account is not an admin. Please assign the admin role in the profiles table.";
      return;
    }

    $("authStatus").textContent =
      "Logged in successfully: " + u.email;

    $("editor").classList.remove("hidden");
    await load();
  }

  $("login").onsubmit = async e => {
    e.preventDefault();

    $("authStatus").textContent = "Logging in…";

    const { error } = await db.auth.signInWithPassword({
      email: $("email").value.trim(),
      password: $("password").value
    });

    if (error) {
      $("authStatus").textContent =
        "Login failed: " + error.message;
      return;
    }

    await check();
  };

  $("logout").onclick = async () => {
    const { error } = await db.auth.signOut();

    if (error) {
      $("authStatus").textContent =
        "Logout failed: " + error.message;
      return;
    }

    user = null;
    $("editor").classList.add("hidden");
    $("authStatus").textContent = "Logged out successfully.";
  };

  function clear() {
    $("newsForm").reset();
    $("postId").value = "";
    oldImage = null;
    $("formTitle").textContent = "Publish News";
    $("photoStatus").textContent = "";
    $("saveStatus").textContent = "";
  }

  $("clear").onclick = clear;

  $("newsForm").onsubmit = async e => {
    e.preventDefault();

    if (!user) return;

    $("save").disabled = true;
    $("saveStatus").textContent = "Saving…";

    try {
      const id = $("postId").value;
      const title = $("title").value.trim();
      const body = $("body").value.trim();

      let image_url = oldImage;
      const file = $("photo").files[0];

      if (file) {
        if (
          !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
          file.size > 5 * 1024 * 1024
        ) {
          throw Error(
            "Choose a JPG, PNG, or WebP image smaller than 5 MB."
          );
        }

        const ext =
          file.type === "image/png"
            ? "png"
            : file.type === "image/webp"
              ? "webp"
              : "jpg";

        const path =
          user.id + "/" + crypto.randomUUID() + "." + ext;

        const { error } = await db.storage
          .from("news-images")
          .upload(path, file, {
            contentType: file.type
          });

        if (error) throw error;

        image_url = db.storage
          .from("news-images")
          .getPublicUrl(path).data.publicUrl;
      }

      let slug = slugify(title);

      if (id) {
        const { data: old, error } = await db
          .from("news")
          .select("slug")
          .eq("id", id)
          .single();

        if (error) throw error;
        slug = old.slug;
      } else {
        slug += "-" + Math.random().toString(36).slice(2, 7);
      }

      const status = $("status").value;

      const payload = {
        title,
        slug,
        category: $("category").value,
        summary: $("summary").value.trim(),
        body,
        author: $("author").value.trim() || "Tez Baani News",
        image_url,
        image_alt: $("alt").value.trim(),
        status,
        published_at:
          status === "published"
            ? new Date().toISOString()
            : null,
        created_by: user.id
      };

      const res = id
        ? await db.from("news").update(payload).eq("id", id)
        : await db.from("news").insert(payload);

      if (res.error) throw res.error;

      $("saveStatus").textContent =
        status === "published"
          ? "News published successfully."
          : "Draft saved successfully.";

      clear();
      await load();

    } catch (err) {
      $("saveStatus").textContent =
        "Error: " + (err.message || "The news could not be saved.");
    } finally {
      $("save").disabled = false;
    }
  };

  async function load() {
    const { data, error } = await db
      .from("news")
      .select("id,title,category,status,slug,created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      $("posts").textContent =
        "Loading error: " + error.message;
      return;
    }

    if (!data.length) {
      $("posts").textContent =
        "No news yet. Add your first story using the form above.";
      return;
    }

    $("posts").innerHTML = data.map(p => `
      <div class="post">
        <div>
          <h3>${esc(p.title)}</h3>
          <p>${esc(p.category)} · ${esc(p.status)}</p>
          ${
            p.status === "published"
              ? `<a class="link" target="_blank" rel="noopener noreferrer"
                   href="article.html?slug=${encodeURIComponent(p.slug)}">
                   View Article ↗
                 </a>`
              : ""
          }
        </div>
        <div>
          <button class="btn secondary" data-edit="${esc(p.id)}">
            Edit
          </button>
          <button class="btn secondary" data-del="${esc(p.id)}">
            Delete
          </button>
        </div>
      </div>
    `).join("");

    $("posts").querySelectorAll("[data-edit]").forEach(b => {
      b.onclick = () => edit(b.dataset.edit);
    });

    $("posts").querySelectorAll("[data-del]").forEach(b => {
      b.onclick = () => del(b.dataset.del);
    });
  }

  async function edit(id) {
    const { data, error } = await db
      .from("news")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    $("postId").value = data.id;
    $("title").value = data.title;
    $("category").value = data.category;
    $("author").value = data.author || "";
    $("summary").value = data.summary || "";
    $("body").value = data.body;
    $("alt").value = data.image_alt || "";
    $("status").value = data.status;

    oldImage = data.image_url;

    $("photoStatus").textContent = oldImage
      ? "An existing image is available. Choose a new image to replace it."
      : "";

    $("formTitle").textContent = "Edit News";

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function del(id) {
    if (
      !confirm(
        "Are you sure you want to permanently delete this news article?"
      )
    ) {
      return;
    }

    const { error } = await db
      .from("news")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await load();
  }

  check();
})();
