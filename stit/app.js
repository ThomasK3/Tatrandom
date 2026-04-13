import { mountains } from './data.js';

// ── Constants ────────────────────────────────────────────────────────────────

const DIFF_LABEL    = { easy: 'Snadná', medium: 'Střední', hard: 'Těžká', expert: 'Expert' };
const COUNTRY_LABEL = { SK: '🇸🇰 Slovensko', PL: '🇵🇱 Polsko' };
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
    const timeRow = m.time !== '—'
      ? `<span class="rc-meta-item"><i class="rc-meta-icon">⏱</i>${m.time}</span>` : '';
    const gainRow = m.gain !== '—'
      ? `<span class="rc-meta-item"><i class="rc-meta-icon">↑</i>${m.gain}</span>` : '';

    const mapUrl   = `https://mapy.cz/zakladni?q=${encodeURIComponent(m.name)}`;
    const shareText = `Dnes lezu na ${m.name} (${m.alt} m n. m.) 🏔️ #Štít`;

    resultInner.innerHTML = `
      <div class="rc-diff-row">
        <span class="rc-dot rc-dot-${m.diff}"></span>
        <span class="rc-diff-label">${DIFF_LABEL[m.diff]}</span>
      </div>
      <h2 class="rc-name">${m.name}</h2>
      <div class="rc-alt">
        <span class="rc-alt-num">${m.alt.toLocaleString('cs')}</span>
        <span class="rc-alt-unit">m n. m.</span>
      </div>
      <div class="rc-meta">${timeRow}${gainRow}</div>
      <div class="rc-divider"></div>
      <p class="rc-desc">${m.desc}</p>
      <p class="rc-country">${COUNTRY_LABEL[m.country]}</p>
      <div class="rc-actions">
        <a  class="rc-action-btn rc-action-map"
            href="${mapUrl}"
            target="_blank"
            rel="noopener noreferrer">
          Otevřít na Mapy.cz ↗
        </a>
        <button class="rc-action-btn rc-action-share"
                data-text="${shareText.replace(/"/g, '&quot;')}"
                type="button">
          Sdílet
        </button>
      </div>
    `;

    // Share button
    resultInner.querySelector('.rc-action-share').addEventListener('click', handleShare);
  });
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
