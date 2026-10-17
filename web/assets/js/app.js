/**
 * AfriTour — Interactive archive controls
 * Features:
 * 1. Dark/Light theme switcher
 * 2. Country comparison
 * 3. Saved observation list
 */

(function () {
  'use strict';

  // =========================================================================
  // 1. THEME SWITCHER (Dark forest <-> warm sand)
  // =========================================================================
  const themeToggleBtn = document.getElementById('theme-toggle-btn');

  function initTheme() {
    let saved = 'dark';
    try {
      saved = localStorage.getItem('afritour-theme') || saved;
    } catch (error) {
      console.error('Unable to read the saved display theme.', error);
    }
    setTheme(saved);
  }

  function setTheme(theme) {
    theme = theme === 'light' ? 'light' : 'dark';
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    try {
      localStorage.setItem('afritour-theme', theme);
    } catch (error) {
      console.error('Unable to save the display theme.', error);
    }
  }

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', function (e) {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      const reducedMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (document.startViewTransition && !reducedMotion) {
        const x = e.clientX || window.innerWidth / 2;
        const y = e.clientY || window.innerHeight / 2;
        const maxRadius = Math.hypot(
          Math.max(x, window.innerWidth - x),
          Math.max(y, window.innerHeight - y)
        );

        const transition = document.startViewTransition(function () {
          setTheme(next);
        });

        transition.ready.then(function () {
          document.documentElement.animate(
            {
              clipPath: [
                'circle(0px at ' + x + 'px ' + y + 'px)',
                'circle(' + maxRadius + 'px at ' + x + 'px ' + y + 'px)'
              ]
            },
            {
              duration: 500,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              pseudoElement: '::view-transition-new(root)'
            }
          );
        });
      } else {
        setTheme(next);
      }
    });
  }

  // =========================================================================
  // 2. SAVED OBSERVATIONS (browser storage)
  // =========================================================================
  const WISHLIST_KEY = 'afritour-wishlist';

  const Wishlist = {
    getAll: function () {
      try {
        const saved = JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]');
        return Array.isArray(saved) ? saved.filter(function (item) {
          return item && typeof item.id === 'string' && typeof item.title === 'string';
        }) : [];
      } catch (error) {
        console.error('Unable to read saved observations from browser storage.', error);
        return [];
      }
    },
    saveAll: function (items) {
      try {
        localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Unable to save observations to browser storage.', error);
      }
      this.updateUI();
    },
    has: function (id) {
      return this.getAll().some(function (item) { return item.id === id; });
    },
    toggle: function (item) {
      let items = this.getAll();
      const idx = items.findIndex(function (i) { return i.id === item.id; });
      if (idx >= 0) {
        items.splice(idx, 1);
      } else {
        items.push({
          id: item.id,
          title: item.title,
          location: item.location || '',
          type: item.type || 'Sighting',
          img: item.img || ''
        });
      }
      this.saveAll(items);
    },
    remove: function (id) {
      const items = this.getAll().filter(function (i) { return i.id !== id; });
      this.saveAll(items);
    },
    clear: function () {
      this.saveAll([]);
    },
    updateUI: function () {
      const items = this.getAll();
      const countBadges = document.querySelectorAll('#nav-wishlist-count');
      countBadges.forEach(function (badge) {
        badge.textContent = items.length;
        badge.hidden = items.length === 0;
      });

      // Update save button states on observation cards.
      document.querySelectorAll('[data-sighting-id]').forEach(function (card) {
        const id = card.dataset.sightingId;
        const btn = card.querySelector('.card__wishlist-btn');
        if (btn) {
          if (Wishlist.has(id)) {
            btn.classList.add('is-active');
          } else {
            btn.classList.remove('is-active');
          }
        }
      });

      // Update drawer item list
      const list = document.getElementById('wishlist-items-list');
      const empty = document.getElementById('wishlist-empty');
      const footer = document.getElementById('wishlist-footer');

      if (!list) return;

      list.replaceChildren();
      if (items.length === 0) {
        if (empty) empty.hidden = false;
        if (footer) footer.hidden = true;
        return;
      }

      if (empty) empty.hidden = true;
      if (footer) footer.hidden = false;

      items.forEach(function (item) {
        const row = document.createElement('li');
        row.className = 'wishlist-item';
        row.dataset.id = item.id;

        if (typeof item.img === 'string' &&
            (item.img.startsWith('https://') ||
             (item.img.startsWith('/') && !item.img.startsWith('//')))) {
          const image = document.createElement('img');
          image.src = item.img;
          image.alt = item.title;
          image.className = 'wishlist-item__img';
          row.appendChild(image);
        }

        const body = document.createElement('div');
        body.className = 'wishlist-item__body';
        const type = document.createElement('span');
        type.className = 'wishlist-item__type';
        type.textContent = typeof item.type === 'string' ? item.type : 'Observation';
        const title = document.createElement('h4');
        title.className = 'wishlist-item__title';
        title.textContent = item.title;
        const location = document.createElement('p');
        location.className = 'wishlist-item__loc';
        location.textContent = typeof item.location === 'string' && item.location !== ''
          ? item.location
          : 'Location not recorded';
        body.append(type, title, location);
        row.appendChild(body);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'wishlist-item__remove';
        remove.setAttribute('aria-label', 'Remove saved observation: ' + item.title);
        remove.textContent = '×';
        remove.addEventListener('click', function () {
          Wishlist.remove(item.id);
        });
        row.appendChild(remove);
        list.appendChild(row);
      });
    }
  };

  window.AfriTourWishlist = Wishlist;

  // =========================================================================
  // 3. COUNTRY COMPARISON
  // =========================================================================
  function initCompareArena() {
    const dataScript = document.getElementById('afritour-compare-data');
    if (!dataScript) return;

    let payload;
    try {
      payload = JSON.parse(dataScript.textContent);
    } catch (e) {
      console.warn('Unable to parse comparison payload');
      return;
    }

    const selectA = document.getElementById('country-a-select');
    const selectB = document.getElementById('country-b-select');
    const swapBtn = document.getElementById('versus-swap-btn');
    if (!selectA || !selectB) return;

    function renderComparison() {
      const codeA = selectA.value;
      const codeB = selectB.value;
      const statA = payload.countries[codeA] || { name: codeA, sightings: 0, species: 0, photos: 0, topWildlife: [] };
      const statB = payload.countries[codeB] || { name: codeB, sightings: 0, species: 0, photos: 0, topWildlife: [] };

      // Update Flags
      const flagA = document.getElementById('flag-a');
      const flagB = document.getElementById('flag-b');
      const tableFlagA = document.getElementById('table-flag-a');
      const tableFlagB = document.getElementById('table-flag-b');
      const sideFlagA = document.getElementById('side-flag-a');
      const sideFlagB = document.getElementById('side-flag-b');

      const flagSrcA = 'https://flagcdn.com/w40/' + codeA.toLowerCase() + '.png';
      const flagSrcB = 'https://flagcdn.com/w40/' + codeB.toLowerCase() + '.png';

      if (flagA) flagA.src = flagSrcA;
      if (flagB) flagB.src = flagSrcB;
      if (tableFlagA) tableFlagA.src = flagSrcA;
      if (tableFlagB) tableFlagB.src = flagSrcB;
      if (sideFlagA) sideFlagA.src = flagSrcA;
      if (sideFlagB) sideFlagB.src = flagSrcB;

      // Update Names
      const tableNameA = document.getElementById('table-name-a');
      const tableNameB = document.getElementById('table-name-b');
      const sideHeadA = document.querySelector('#side-head-a span');
      const sideHeadB = document.querySelector('#side-head-b span');
      const sideSubA = document.getElementById('side-sub-a');
      const sideSubB = document.getElementById('side-sub-b');

      if (tableNameA) tableNameA.textContent = statA.name;
      if (tableNameB) tableNameB.textContent = statB.name;
      if (sideHeadA) sideHeadA.textContent = statA.name + ' observations';
      if (sideHeadB) sideHeadB.textContent = statB.name + ' observations';
      if (sideSubA) sideSubA.textContent = statA.sightings + ' sightings across ' + statA.species + ' species';
      if (sideSubB) sideSubB.textContent = statB.sightings + ' sightings across ' + statB.species + ' species';

      // Update Rounds
      const cellSpecA = document.getElementById('score-species-a');
      const cellSpecB = document.getElementById('score-species-b');
      const cellSightA = document.getElementById('score-sightings-a');
      const cellSightB = document.getElementById('score-sightings-b');
      const cellPhotoA = document.getElementById('score-photos-a');
      const cellPhotoB = document.getElementById('score-photos-b');

      if (cellSpecA) cellSpecA.textContent = statA.species;
      if (cellSpecB) cellSpecB.textContent = statB.species;
      if (cellSightA) cellSightA.textContent = statA.sightings;
      if (cellSightB) cellSightB.textContent = statB.sightings;
      if (cellPhotoA) cellPhotoA.textContent = statA.photos;
      if (cellPhotoB) cellPhotoB.textContent = statB.photos;

      function compareRound(valA, valB, elA, elB) {
        if (!elA || !elB) return;
        elA.classList.remove('is-higher');
        elB.classList.remove('is-higher');
        if (valA > valB) {
          elA.classList.add('is-higher');
        } else if (valB > valA) {
          elB.classList.add('is-higher');
        }
      }

      compareRound(statA.species, statB.species, cellSpecA, cellSpecB);
      compareRound(statA.sightings, statB.sightings, cellSightA, cellSightB);
      compareRound(statA.photos, statB.photos, cellPhotoA, cellPhotoB);

      // Update Wildlife Lists
      renderWildlifeList('side-list-a', statA.topWildlife);
      renderWildlifeList('side-list-b', statB.topWildlife);

      // Calculate Shared Wildlife Intersection
      renderSharedWildlife(statA.topWildlife, statB.topWildlife, statA.name, statB.name);
    }

    function renderWildlifeList(listId, items) {
      const list = document.getElementById(listId);
      if (!list) return;
      list.replaceChildren();
      if (!items || items.length === 0) {
        const empty = document.createElement('li');
        empty.className = 'versus-row versus-row--empty';
        empty.textContent = 'No records available';
        list.appendChild(empty);
        return;
      }
      const maxCount = items[0].count || 1;
      items.forEach(function (item) {
        const pct = Math.max(15, Math.round((item.count / maxCount) * 100));
        const row = document.createElement('li');
        row.className = 'versus-row';
        row.dataset.name = item.name;

        if (typeof item.photoUrl === 'string' && item.photoUrl.startsWith('https://')) {
          const image = document.createElement('img');
          image.src = item.photoUrl;
          image.alt = '';
          image.className = 'versus-row__img';
          image.loading = 'lazy';
          row.appendChild(image);
        }

        const name = document.createElement('span');
        name.className = 'versus-row__name';
        name.textContent = item.name;
        row.appendChild(name);

        const barWrap = document.createElement('span');
        barWrap.className = 'versus-row__bar-wrap';
        const bar = document.createElement('span');
        bar.className = 'versus-row__bar';
        bar.style.width = pct + '%';
        barWrap.appendChild(bar);
        row.appendChild(barWrap);

        const count = document.createElement('span');
        count.className = 'versus-row__count';
        count.textContent = String(item.count);
        row.appendChild(count);
        list.appendChild(row);
      });
    }

    function renderSharedWildlife(listA, listB, nameA, nameB) {
      const container = document.getElementById('shared-chips');
      const label = document.getElementById('shared-count-label');
      if (!container) return;

      const mapA = {};
      (listA || []).forEach(function (i) { mapA[i.name] = i.count; });

      const shared = [];
      (listB || []).forEach(function (i) {
        if (mapA[i.name] !== undefined) {
          shared.push({
            name: i.name,
            countA: mapA[i.name],
            countB: i.count
          });
        }
      });

      if (label) {
        label.textContent = shared.length > 0 ? shared.length + ' Animals in Common' : 'Distinct Species';
      }

      if (shared.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'shared-empty';
        empty.textContent = 'No species are shared between these lists.';
        container.replaceChildren(empty);
        return;
      }

      container.replaceChildren();
      shared.forEach(function (species) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'shared-chip';
        button.dataset.shared = species.name;
        button.title = species.name + ': ' + species.countA + ' in ' + nameA + ', ' +
          species.countB + ' in ' + nameB;
        const label = document.createElement('span');
        label.textContent = species.name;
        const counts = document.createElement('span');
        counts.className = 'shared-chip__counts';
        counts.textContent = species.countA + ' vs ' + species.countB;
        button.append(label, counts);
        container.appendChild(button);
      });

      // Chip click highlight
      container.querySelectorAll('.shared-chip').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const spName = this.dataset.shared;
          const active = this.classList.contains('is-selected');

          container.querySelectorAll('.shared-chip').forEach(function (c) { c.classList.remove('is-selected'); });
          document.querySelectorAll('.versus-row').forEach(function (r) { r.classList.remove('is-highlighted'); });

          if (!active) {
            this.classList.add('is-selected');
            document.querySelectorAll('.versus-row').forEach(function (row) {
              if (row.dataset.name === spName) {
                row.classList.add('is-highlighted');
              }
            });
          }
        });
      });
    }

    selectA.addEventListener('change', renderComparison);
    selectB.addEventListener('change', renderComparison);

    if (swapBtn) {
      swapBtn.addEventListener('click', function () {
        const temp = selectA.value;
        selectA.value = selectB.value;
        selectB.value = temp;
        this.classList.add('is-spinning');
        setTimeout(() => this.classList.remove('is-spinning'), 300);
        renderComparison();
      });
    }

    // Initial render
    renderComparison();
  }

  // =========================================================================
  // 8. MOBILE NAVIGATION DRAWER
  // =========================================================================
  function initMobileMenu() {
    const btn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    if (!btn || !drawer) return;

    btn.addEventListener('click', function () {
      const open = !drawer.hidden;
      drawer.hidden = open;
      btn.setAttribute('aria-expanded', String(!open));
      btn.classList.toggle('is-active', !open);
    });

    drawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        drawer.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('is-active');
      });
    });
  }

  // =========================================================================
  // BOOTSTRAP ON DOM READY
  // =========================================================================
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    Wishlist.updateUI();
    initCompareArena();
    initMobileMenu();
  });
})();
