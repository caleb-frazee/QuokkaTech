const statusElement = document.getElementById('status');
const contentElement = document.getElementById('content');
const coverElement = document.getElementById('cover');
const animeTitleElement = document.getElementById('animeTitle');
const episodeLineElement = document.getElementById('episodeLine');
const infoLineElement = document.getElementById('infoLine');
const genresLineElement = document.getElementById('genresLine');
const synopsisElement = document.getElementById('synopsis');
const animeLinkElement = document.getElementById('animeLink');
const toggleCharactersBtn = document.getElementById('toggleCharactersBtn');
const charactersSection = document.getElementById('charactersSection');
const charactersList = document.getElementById('charactersList');

let currentAnimeId = null;
let charactersLoaded = false;
let charactersVisible = false;

loadPopup();

toggleCharactersBtn.addEventListener('click', handleCharacterToggle);

async function loadPopup() {
    const [tab] = await queryActiveTab();

    if (!tab || !tab.url) {
        statusElement.textContent = 'No active tab found.';
        return;
    }

    if (!tab.url.includes('crunchyroll.com/watch/')) {
        statusElement.textContent = 'Please navigate to a Crunchyroll watch page.';
        return;
    }

    const rawTitle = tab.title || '';
    const cleanedTitle = cleanCrunchyrollTitle(rawTitle);

    try {
        const response = await sendMessage({
            action: 'fetchAnimeDetails',
            title: cleanedTitle,
        });

        if (response.success && response.data) {
            const anime = response.data;

            currentAnimeId = anime.mal_id || null;
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

            if (currentAnimeId) {
                toggleCharactersBtn.classList.remove('hidden');
                toggleCharactersBtn.textContent = 'Show characters';
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

function queryActiveTab() {
    return new Promise((resolve, reject) => {
        try {
            const result = chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(tabs || []);
            });

            if (result && typeof result.then === 'function') {
                result.then(resolve).catch(reject);
            }
        } catch (error) {
            reject(error);
        }
    });
}

function sendMessage(request) {
    return new Promise((resolve, reject) => {
        try {
            let responded = false;
            const callback = response => {
                responded = true;
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve(response);
            };

            const result = chrome.runtime.sendMessage(request, callback);
            if (result && typeof result.then === 'function') {
                result.then(response => {
                    if (!responded) {
                        resolve(response);
                    }
                }).catch(err => {
                    if (!responded) {
                        reject(err);
                    }
                });
            }

            setTimeout(() => {
                if (!responded) {
                    reject(new Error('Background request timed out.'));
                }
            }, 7000);
        } catch (error) {
            reject(error);
        }
    });
}

function cleanCrunchyrollTitle(rawTitle) {
    let title = rawTitle
        .replace(/\|\s*Crunchyroll.*$/i, '')
        .replace(/^Watch\s*[:-]?\s*/i, '')
        .replace(/Watch\s*$/i, '')
        .replace(/Episode\s*\d+(.*)$/i, '')
        .replace(/Ep\.?\s*\d+(.*)$/i, '')
        .trim();

    if (title.includes(' - ')) {
        const parts = title.split(' - ').map(part => part.trim()).filter(Boolean);
        const episodePart = parts.find(part => /^(Episode|Ep\.?|Watch)/i.test(part));
        title = episodePart ? parts.filter(part => part !== episodePart).join(' - ') : parts[0];
    }

    return title;
}

async function handleCharacterToggle() {
    if (!currentAnimeId) {
        return;
    }

    charactersVisible = !charactersVisible;

    if (charactersVisible) {
        if (!charactersLoaded) {
            toggleCharactersBtn.disabled = true;
            toggleCharactersBtn.textContent = 'Loading characters...';

            try {
                const response = await sendMessage({
                    action: 'fetchAnimeCharacters',
                    mal_id: currentAnimeId,
                });

                if (response.success && Array.isArray(response.characters) && response.characters.length) {
                    renderCharacters(response.characters);
                } else {
                    charactersList.innerHTML = `<p>${response.error || 'Characters not found.'}</p>`;
                }
            } catch (error) {
                charactersList.innerHTML = '<p>Error loading characters.</p>';
                console.error(error);
            }

            charactersLoaded = true;
            toggleCharactersBtn.disabled = false;
        }

        charactersSection.classList.remove('hidden');
        toggleCharactersBtn.textContent = 'Hide characters';
    } else {
        charactersSection.classList.add('hidden');
        toggleCharactersBtn.textContent = 'Show characters';
    }
}

function renderCharacters(characters) {
    charactersList.innerHTML = '';

    characters.slice(0, 12).forEach(character => {
        const card = document.createElement('div');
        card.className = 'character-card';

        const image = document.createElement('img');
        image.src = character.image || '';
        image.alt = character.name;

        const details = document.createElement('div');
        details.className = 'character-details';

        const name = document.createElement('p');
        name.className = 'character-name';
        name.textContent = character.name;

        const role = document.createElement('p');
        role.className = 'character-meta';
        role.textContent = `Role: ${character.role}`;

        details.appendChild(name);
        details.appendChild(role);

        if (character.voice_actors && character.voice_actors.length) {
            const va = document.createElement('p');
            va.className = 'character-meta';
            va.textContent = `VA: ${character.voice_actors[0].name} (${character.voice_actors[0].language})`;
            details.appendChild(va);
        }

        card.appendChild(image);
        card.appendChild(details);
        charactersList.appendChild(card);
    });
}
