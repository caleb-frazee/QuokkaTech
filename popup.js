const statusElement = document.getElementById('status');
const contentElement = document.getElementById('content');
const coverElement = document.getElementById('cover');
const animeTitleElement = document.getElementById('animeTitle');
const episodeLineElement = document.getElementById('episodeLine');
const infoLineElement = document.getElementById('infoLine');
const genresLineElement = document.getElementById('genresLine');
const synopsisElement = document.getElementById('synopsis');
const animeLinkElement = document.getElementById('animeLink');

loadPopup();

async function loadPopup() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
        statusElement.textContent = 'No active tab found.';
        return;
    }

    if (!tab.url.includes('crunchyroll.com/watch/')) {
        statusElement.textContent = 'Please navigate to a Crunchyroll watch page.';
        return;
    }

    const rawTitle = tab.title || '';
    const cleanedTitle = rawTitle
        .replace(/\|\s*Crunchyroll.*$/i, '')
        .replace(/Watch\s*/i, '')
        .split(' - ')[0]
        .trim();

    try {
        const response = await chrome.runtime.sendMessage({
            action: 'fetchAnimeDetails',
            title: cleanedTitle,
        });

        if (response.success && response.data) {
            const anime = response.data;

            coverElement.src = anime.images?.jpg?.image_url || '';
            animeTitleElement.textContent = anime.title || 'Unknown title';
            episodeLineElement.textContent = `Episodes: ${anime.episodes || 'N/A'}`;
            infoLineElement.textContent = `Score: ${anime.score || 'N/A'} | Status: ${anime.status || 'N/A'}`;
            genresLineElement.textContent = `Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}`;
            synopsisElement.textContent = anime.synopsis || 'No synopsis available.';
            animeLinkElement.href = anime.url || '#';
            animeLinkElement.style.display = 'block';

            if (anime.images?.jpg?.image_url) {
                coverElement.classList.remove('hidden');
            }

            statusElement.style.display = 'none';
            contentElement.classList.remove('hidden');
        } else {
            statusElement.textContent = response?.error || 'Anime not found.';
        }
    } catch (error) {
        statusElement.textContent = 'Error talking to background script.';
        console.error(error);
    }
}