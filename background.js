chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchAnimeDetails') {
        fetchBestAnimeMatch(request.title)
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

    if (request.action === 'fetchAnimeCharacters') {
        fetchAnimeCharacters(request.mal_id)
            .then(characters => {
                sendResponse({ success: true, characters });
            })
            .catch(error => {
                sendResponse({ success: false, error: error.message });
            });

        return true;
    }
});

async function fetchBestAnimeMatch(title) {
    if (!title) {
        throw new Error('Could not determine anime title.');
    }

    const response = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=15`
    );

    if (!response.ok) {
        throw new Error('Failed to fetch from Jikan API');
    }

    const data = await response.json();
    const candidates = data.data || [];

    if (!candidates.length) {
        return null;
    }

    const normalizedQuery = normalizeName(title);

    let bestMatch = null;
    let bestScore = -1;

    for (const anime of candidates) {
        const score = getMatchScore(normalizedQuery, anime);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = anime;
        }
    }

    return bestMatch || candidates[0];
}

function normalizeName(name) {
    return String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[\x00-\x1f\x7f-\x9f]/g, "")
        .replace(/[^0-9a-z\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getMatchScore(query, anime) {
    const titles = [
        anime.title,
        anime.title_english,
        anime.title_japanese,
        ...(anime.title_synonyms || [])
    ]
        .filter(Boolean)
        .map(normalizeName);

    if (!query) {
        return 0;
    }

    let highest = 0;
    for (const candidate of titles) {
        if (!candidate) {
            continue;
        }

        if (candidate === query) {
            return 100;
        }

        if (candidate.startsWith(query) || query.startsWith(candidate)) {
            highest = Math.max(highest, 90);
        }

        if (candidate.includes(query) || query.includes(candidate)) {
            highest = Math.max(highest, 70);
        }

        const candidateTokens = candidate.split(' ').filter(Boolean);
        const queryTokens = query.split(' ').filter(Boolean);
        const overlap = candidateTokens.filter(token => queryTokens.includes(token)).length;

        if (overlap > 0) {
            const overlapScore = Math.floor((overlap / Math.max(candidateTokens.length, queryTokens.length)) * 60);
            highest = Math.max(highest, overlapScore);
        }
    }

    return highest;
}

async function fetchAnimeCharacters(mal_id) {
    if (!mal_id) {
        throw new Error('Missing anime ID for character fetch.');
    }

    const response = await fetch(`https://api.jikan.moe/v4/anime/${encodeURIComponent(mal_id)}/characters`);

    if (!response.ok) {
        throw new Error('Failed to fetch character data from Jikan API');
    }

    const data = await response.json();
    return (data.data || []).map(item => ({
        name: item.character?.name || 'Unknown',
        image: item.character?.images?.jpg?.image_url || '',
        role: item.role || 'Unknown',
        voice_actors: (item.voice_actors || []).slice(0, 1).map(actor => ({
            name: actor.person?.name || 'Unknown',
            language: actor.language || 'Unknown'
        }))
    }));
}
