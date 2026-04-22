chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAnimeDetails') {
        fetchAnimeFromJikan(request.title)
            .then(data => {
                if (!data) {
                    sendResponse({ success: false, error: 'No anime found.' });
                    return;
                }

                sendResponse({ success: true, data });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }
});

async function fetchAnimeFromJikan(title) {
    if (!title) {
        throw new Error('Could not determine anime title.');
    }

    const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch from Jikan API');
    }

    const data = await response.json();
    return data.data?.[0] || null;
}