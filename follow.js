
(async function () {
  const button = document.getElementById("followButton");
  const countEl = document.getElementById("followerCount");
  const message = document.getElementById("followMessage");

  if (!button || !countEl || !message) return;

  const config = window.TEZ_CONFIG;

  if (
    !window.supabase ||
    !config?.SUPABASE_URL ||
    !config?.SUPABASE_ANON_KEY
  ) {
    message.textContent = "Follow service is not configured yet.";
    button.disabled = true;
    return;
  }

  const client = window.supabase.createClient(
    config.SUPABASE_URL,
    config.SUPABASE_ANON_KEY
  );

  let visitorId;

  try {
    visitorId = localStorage.getItem("tez_baani_visitor_id");

    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("tez_baani_visitor_id", visitorId);
    }
  } catch (error) {
    message.textContent = "Please allow browser storage to Follow.";
    button.disabled = true;
    return;
  }

  async function loadCount() {
    const { data, error } = await client.rpc(
      "get_tez_baani_followers"
    );
    if (error) throw error;
    countEl.textContent = Number(data).toLocaleString("en-IN");
  }

  try {
    await loadCount();

    if (localStorage.getItem("tez_baani_followed") === "yes") {
      button.textContent = "✓ Following";
      button.disabled = true;
    }
  } catch (error) {
    console.error(error);
    message.textContent = "Could not load followers. Please try again later.";
  }

  button.addEventListener("click", async function () {
    button.disabled = true;
    message.textContent = "Please wait...";

    try {
      const { data, error } = await client.rpc(
        "follow_tez_baani",
        { p_visitor_id: visitorId }
      );

      if (error) throw error;

      countEl.textContent = Number(data.count).toLocaleString("en-IN");
      localStorage.setItem("tez_baani_followed", "yes");
      button.textContent = "✓ Following";
      message.textContent = data.followed
        ? "Thank you for following Tez Baani News!"
        : "You have already followed this website.";
    } catch (error) {
      console.error(error);
      message.textContent = "Follow failed. Please try again.";
      button.disabled = false;
    }
  });
})();
