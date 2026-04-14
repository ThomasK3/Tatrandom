import { mountains } from './data.js';

// ── Constants ────────────────────────────────────────────────────────────────

const DIFF_LABEL = { easy: 'Snadná', medium: 'Střední', hard: 'Těžká', expert: 'Expert' };
const HISTORY_MAX   = 3;

// ── State ────────────────────────────────────────────────────────────────────

const state = {
  diffs:     new Set(['all']),
  countries: new Set(['all']),
  minAlt:    1000,
  history:   [],          // array of mountain objects, newest first
};

// ── DOM refs ─────────────────────────────────────────────────────────────────

const diffGroup    = document.getElementById('diff-group');
const countryGroup = document.getElementById('country-group');
const altSlider    = document.getElementById('alt-slider');
const sliderValue  = document.getElementById('slider-value');
const drawBtn      = document.getElementById('draw-btn');
const drawHint     = document.getElementById('draw-hint');
const poolCount    = document.getElementById('pool-count');
const resultCard   = document.getElementById('result-card');
const resultInner  = document.getElementById('result-inner');
const historyWrap  = document.getElementById('history-wrap');
const historyChips = document.getElementById('history-chips');

// ── Filtering ────────────────────────────────────────────────────────────────

function getPool() {
  return mountains.filter(m => {
    const diffOk    = state.diffs.has('all')     || state.diffs.has(m.diff);
    const countryOk = state.countries.has('all') || state.countries.has(m.country);
    return diffOk && countryOk && m.alt >= state.minAlt;
  });
}

// ── Pill groups ───────────────────────────────────────────────────────────────

function bindPillGroup(groupEl, stateKey) {
  groupEl.querySelectorAll('.pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const value   = btn.dataset[stateKey];
      const current = state[stateKey + 's'];

      if (value === 'all') {
        current.clear();
        current.add('all');
      } else {
        current.delete('all');
        current.has(value) ? current.delete(value) : current.add(value);
        if (current.size === 0) current.add('all');
      }

      syncPillUI(groupEl, current, stateKey);
      updateCounter();
    });
  });
}

function syncPillUI(groupEl, activeSet, stateKey) {
  groupEl.querySelectorAll('.pill').forEach(btn => {
    const on = activeSet.has(btn.dataset[stateKey]);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on);
  });
}

// ── Slider ────────────────────────────────────────────────────────────────────

function updateSliderTrack() {
  const pct = ((altSlider.value - altSlider.min) / (altSlider.max - altSlider.min)) * 100;
  altSlider.style.background =
    `linear-gradient(to right, var(--col-accent) ${pct}%, var(--col-border) ${pct}%)`;
}

altSlider.addEventListener('input', () => {
  state.minAlt = Number(altSlider.value);
  sliderValue.textContent = `${state.minAlt.toLocaleString('cs')} m`;
  updateSliderTrack();
  updateCounter();
});

// ── Counter ───────────────────────────────────────────────────────────────────

function pluralHor(n) {
  if (n === 1) return '1 hora odpovídá filtrům';
  if (n >= 2 && n <= 4) return `${n} hory odpovídají filtrům`;
  return `${n} hor odpovídá filtrům`;
}

function updateCounter() {
  const n = getPool().length;
  if (poolCount) poolCount.textContent = pluralHor(n);
  drawHint.textContent = n === 0 ? 'Zkuste změnit filtry nebo snížit minimální výšku.' : '';
  drawBtn.disabled = n === 0;
}

// ── Draw ──────────────────────────────────────────────────────────────────────

drawBtn.addEventListener('click', draw);

function draw() {
  const candidates = getPool();
  if (!candidates.length) {
    showEmpty();
    return;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  pushHistory(pick);
  showResult(pick);
}

// ── Result card ───────────────────────────────────────────────────────────────

function animateCard(fn) {
  resultCard.classList.remove('visible');
  fn();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      resultCard.classList.add('visible');
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

function showResult(m) {
  animateCard(() => {
    const mapUrl    = `https://mapy.cz/turisticka?q=${encodeURIComponent(m.name)}&layers=T`;
    const shareText = `Dnes lezu na ${m.name} (${m.alt} m n. m.) 🏔️ #Štít`;

    const guideBadge = m.guide_required
      ? `<div class="rc-guide-badge">⚠ Průvodce povinný</div>`
      : '';

    const timeVal = m.time !== '—' ? m.time : '—';
    const gainVal = m.gain !== '—' ? m.gain : '—';

    resultInner.innerHTML = `
      <div class="rc-photo" id="rc-photo">
        <div class="rc-photo-skeleton"></div>
      </div>
      <div class="rc-weather" id="rc-weather">
        <div class="rc-weather-skeleton"></div>
      </div>
      <div class="rc-body">

        <!-- 2. Name + country badge -->
        <div class="rc-header-row">
          <h2 class="rc-name">${m.name}</h2>
          <span class="rc-country-badge">${m.country}</span>
        </div>

        <!-- 3. Altitude + source -->
        <div class="rc-alt">
          <span class="rc-alt-num">${m.alt.toLocaleString('cs')}</span>
          <span class="rc-alt-unit">m n. m.</span>
          <span class="rc-alt-source">${m.alt_source}</span>
        </div>

        <!-- 4. Meta 2×2 grid -->
        <div class="rc-meta-grid">
          <div class="rc-meta-cell">
            <span class="rc-meta-label">Obtížnost</span>
            <span class="rc-meta-val rc-diff-val">
              <span class="rc-dot rc-dot-${m.diff}"></span>${DIFF_LABEL[m.diff]}
            </span>
          </div>
          <div class="rc-meta-cell">
            <span class="rc-meta-label">Čas výstupu</span>
            <span class="rc-meta-val">${timeVal}</span>
          </div>
          <div class="rc-meta-cell">
            <span class="rc-meta-label">Převýšení</span>
            <span class="rc-meta-val">${gainVal}</span>
          </div>
          <div class="rc-meta-cell">
            <span class="rc-meta-label">Nejlepší měsíce</span>
            <span class="rc-meta-val">${m.best_season}</span>
          </div>
        </div>

        <!-- 5. Guide required -->
        ${guideBadge}

        <!-- 6. Facts row -->
        <div class="rc-facts">
          <div class="rc-fact">
            <span class="rc-fact-label">První výstup</span>
            <span class="rc-fact-val">${m.first_ascent}</span>
          </div>
          <div class="rc-fact">
            <span class="rc-fact-label">Nejbližší chata</span>
            <span class="rc-fact-val">${m.nearest_hut}</span>
          </div>
        </div>

        <!-- 7. Fun fact -->
        <blockquote class="rc-funfact">${m.fun_fact}</blockquote>

        <!-- 8. Description -->
        <p class="rc-desc">${m.desc}</p>

        <!-- 9. Buttons -->
        <div class="rc-actions">
          <a class="rc-action-btn rc-action-map"
             href="${mapUrl}"
             target="_blank"
             rel="noopener noreferrer">
            Turistická mapa →
          </a>
          <button class="rc-action-btn rc-action-share"
                  data-text="${shareText.replace(/"/g, '&quot;')}"
                  type="button">
            Sdílet
          </button>
        </div>

      </div>
    `;

    resultInner.querySelector('.rc-action-share').addEventListener('click', handleShare);
  });

  // Fetch photo and weather asynchronously — don't block the card animation
  fetchWikiPhoto(m.wiki_title);
  fetchWeather(m.lat, m.lng, m.alt);
}

// ── Wikipedia photo ───────────────────────────────────────────────────────────

const WIKI_FALLBACK_SVG = `
  <svg class="rc-photo-fallback" viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect width="560" height="200" fill="var(--col-bg)"/>
    <polyline
      points="0,200 80,120 140,155 220,70 290,110 370,45 440,95 510,60 560,80 560,200"
      fill="var(--col-border)" stroke="none"/>
    <circle cx="370" cy="45" r="4" fill="var(--col-muted)" opacity="0.5"/>
  </svg>`;

async function fetchWikiPhoto(wikiTitle) {
  const photoEl = document.getElementById('rc-photo');
  if (!photoEl) return;

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error('not ok');

    const data = await res.json();
    const src  = data?.thumbnail?.source;

    // Guard: make sure this card is still the current one
    if (!document.getElementById('rc-photo')) return;

    if (src) {
      const img = new Image();
      img.onload = () => {
        if (!document.getElementById('rc-photo')) return;
        photoEl.innerHTML = `
          <img class="rc-photo-img" src="${src}" alt="${data.title}" loading="lazy"/>
          <p class="rc-photo-credit">© Wikipedia / Wikimedia Commons</p>
        `;
      };
      img.onerror = () => setFallback(photoEl);
      img.src = src;
    } else {
      setFallback(photoEl);
    }
  } catch {
    if (document.getElementById('rc-photo')) setFallback(photoEl);
  }
}

function setFallback(photoEl) {
  photoEl.innerHTML = WIKI_FALLBACK_SVG;
}

// ── Weather ───────────────────────────────────────────────────────────────────

function weatherLabel(code) {
  if (code === 0)                          return 'Jasno';
  if (code <= 3)                           return 'Polojasno';
  if (code === 45 || code === 48)          return 'Mlha';
  if (code >= 51 && code <= 67)            return 'Déšť';
  if (code >= 71 && code <= 77)            return 'Sníh';
  if (code >= 80 && code <= 82)            return 'Přeháňky';
  if (code >= 95 && code <= 99)            return 'Bouřka';
  return 'Proměnlivě';
}

async function fetchWeather(lat, lng, alt) {
  const weatherEl = document.getElementById('rc-weather');
  if (!weatherEl) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${lat}&longitude=${lng}&elevation=${alt}`
      + `&current=temperature_2m,wind_speed_10m,weather_code`;

    const res  = await fetch(url);
    if (!res.ok) throw new Error('weather fetch failed');
    const data = await res.json();

    if (!document.getElementById('rc-weather')) return;

    const c    = data.current;
    const temp = Math.round(c.temperature_2m);
    const wind = Math.round(c.wind_speed_10m);
    const label = weatherLabel(c.weather_code);

    weatherEl.innerHTML = `
      <div class="rc-weather-inner">
        <div class="rc-weather-stats">
          <span class="rc-weather-item">🌡 <strong>${temp}°C</strong></span>
          <span class="rc-weather-item">💨 <strong>${wind} km/h</strong></span>
          <span class="rc-weather-item">☁ <strong>${label}</strong></span>
        </div>
        <span class="rc-weather-note">Aktuální podmínky na vrcholu</span>
      </div>
    `;
  } catch {
    // Hide the strip silently on any error
    const el = document.getElementById('rc-weather');
    if (el) el.hidden = true;
  }
}

function showEmpty() {
  animateCard(() => {
    resultInner.innerHTML = `<p class="rc-empty">Žádná hora neodpovídá filtrům.</p>`;
  });
}

// ── Share / clipboard ─────────────────────────────────────────────────────────

function handleShare(e) {
  const btn  = e.currentTarget;
  const text = btn.dataset.text;

  navigator.clipboard.writeText(text).then(() => {
    showTooltip(btn, 'Zkopírováno!');
  }).catch(() => {
    // Fallback for browsers that block clipboard without HTTPS
    showTooltip(btn, 'Kopírování selhalo');
  });
}

function showTooltip(anchor, message) {
  // Remove any existing tooltip
  document.querySelector('.clipboard-tooltip')?.remove();

  const tip = document.createElement('span');
  tip.className  = 'clipboard-tooltip';
  tip.textContent = message;
  anchor.parentElement.appendChild(tip);

  // Position above the button
  const btnRect = anchor.getBoundingClientRect();
  const wrapRect = anchor.parentElement.getBoundingClientRect();
  tip.style.left = `${anchor.offsetLeft + anchor.offsetWidth / 2}px`;

  // Trigger fade-in
  requestAnimationFrame(() => tip.classList.add('visible'));

  setTimeout(() => {
    tip.classList.remove('visible');
    tip.addEventListener('transitionend', () => tip.remove(), { once: true });
  }, 1800);
}

// ── History ───────────────────────────────────────────────────────────────────

function pushHistory(m) {
  // Remove duplicate if same mountain picked again
  state.history = state.history.filter(h => h.name !== m.name);
  state.history.unshift(m);
  if (state.history.length > HISTORY_MAX) state.history.pop();
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    historyWrap.hidden = true;
    return;
  }
  historyWrap.hidden = false;
  historyChips.innerHTML = state.history.map((m, i) => `
    <button class="history-chip" data-index="${i}" type="button">
      ${m.name}
    </button>
  `).join('');

  historyChips.querySelectorAll('.history-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const m = state.history[+chip.dataset.index];
      showResult(m);
    });
  });
}

// ── Keyboard shortcut ─────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  // Space triggers draw, but not when focus is inside an input/button/slider
  const tag = document.activeElement?.tagName;
  if (e.code === 'Space' && tag !== 'BUTTON' && tag !== 'INPUT') {
    e.preventDefault();
    draw();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

bindPillGroup(diffGroup,    'diff');
bindPillGroup(countryGroup, 'country');
syncPillUI(diffGroup,    state.diffs,     'diff');
syncPillUI(countryGroup, state.countries, 'country');
updateSliderTrack();
updateCounter();
