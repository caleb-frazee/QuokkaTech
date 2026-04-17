// background.js

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        chrome.tabs.sendMessage(tabId, { action: 'getUrl' });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAnimeDetails') {
        fetchAnimeFromJikan(request.url).then(data => {
            sendResponse({ success: true, data });
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    }
});

async function fetchAnimeFromJikan(url) {
    // Extract anime title from URL or Crunchyroll page
    const title = extractTitleFromUrl(url);
    
    const response = await fetch(`https://api.jikan.moe/rest/api/v4/anime?query=${encodeURIComponent(title)}&limit=1`);
    if (!response.ok) throw new Error('Failed to fetch from Jikan API');
    
    const data = await response.json();
    return data.data[0] || null;
}

function extractTitleFromUrl(url) {
    // Extract anime title from Crunchyroll URL
    const match = url.match(/crunchyroll\.com\/[a-z]+\/([a-z0-9-]+)/i);
    return match ? match[1].replace(/-/g, ' ') : '';
}