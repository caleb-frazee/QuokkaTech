function getPageInfo() {
  const path = window.location.pathname || "";
  const pageTitle = document.title || "";
  const ogTitle = document.querySelector('meta[property="og:title"]')?.content || "";

  const rawTitle = ogTitle || pageTitle;
  const cleanTitle = rawTitle
    .replace(/\|\s*Crunchyroll.*$/i, "")
    .replace(/Watch\s*/i, "")
    .trim();

  const parts = cleanTitle.split(" - ").map(part => part.trim()).filter(Boolean);
  const showTitle = parts[0] || cleanTitle;
  const episodeTitle = parts[1] || "";

  return {
    platform: "Crunchyroll",
    url: window.location.href,
    isWatchPage: path.includes("/watch/"),
    showTitle,
    episodeTitle
  };
}

function sendPageInfo() {
  chrome.runtime.sendMessage({
    type: "SAVE_PAGE_INFO",
    payload: getPageInfo()
  }).catch(() => {});
}

sendPageInfo();
setInterval(sendPageInfo, 3000); 