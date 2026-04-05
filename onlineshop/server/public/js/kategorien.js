/*
  Datei: kategorien.js
  Beschreibung: Diese Datei lädt alle Kategorien vom Backend und zeigt sie an zwei Stellen an:
    als Karten auf der Startseite und als Einträge im Dropdown-Menü im Header.
    Außerdem wird das Dropdown-Menü initialisiert, sodass es per Klick geöffnet und geschlossen werden kann.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

/**
 * Lädt alle Kategorien vom Backend und rendert sie
 * als Karten auf der Startseite sowie im Dropdown-Menü im Header.
 * Initialisiert zusätzlich das Kategorien-Dropdown.
 *
 * @async
 * @function loadKategorien
 * @returns {Promise<void>}
 */
async function loadKategorien() {
  try {
    const response = await fetch('/kategorien');

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Kategorien vom Server');
    }

    const kategorien = await response.json();

    renderKategorienCards(kategorien);
    renderKategorienDropdown(kategorien);
    initKategorienDropdown();

  } catch (error) {
    console.error('Fehler beim Laden der Kategorien:', error);
  }
}

/**
 * Rendert die Kategorien als Karten
 * im Kategorien-Container der Startseite.
 *
 * @function renderKategorienCards
 * @param {Array<Object>} kategorien - Liste der Kategorien
 */
function renderKategorienCards(kategorien) {
  const container = document.getElementById('kategorien-container');

  if (!container) {
    return;
  }

  container.innerHTML = '';

  if (kategorien.length === 0) {
    container.innerHTML = '<p>Keine Kategorien gefunden.</p>';
    return;
  }

  kategorien.forEach(kategorie => {
    const card = `
      <div class="col-md-3">
        <div class="category-card">
          <h5>${kategorie.bezeichnung}</h5>
          <p>Kategorie aus der Datenbank</p>
          <a href="/static/kategorie.html?id=${kategorie.id}" class="btn btn-sm btn-main">Ansehen</a>
        </div>
      </div>
    `;

    container.innerHTML += card;
  });
}

/**
 * Rendert die Kategorien als Einträge
 * im Dropdown-Menü im Header.
 *
 * @function renderKategorienDropdown
 * @param {Array<Object>} kategorien - Liste der Kategorien
 */
function renderKategorienDropdown(kategorien) {
  const dropdownList = document.getElementById('kategorien-dropdown-list');

  if (!dropdownList) {
    return;
  }

  dropdownList.innerHTML = '';

  if (kategorien.length === 0) {
    dropdownList.innerHTML = `
      <li class="kategorien-dropdown-empty">Keine Kategorien gefunden</li>
    `;
    return;
  }

  kategorien.forEach(kategorie => {
    const dropdownItem = `
      <li>
        <a class="kategorien-dropdown-item" href="/static/kategorie.html?id=${kategorie.id}">
          ${kategorie.bezeichnung}
        </a>
      </li>
    `;

    dropdownList.innerHTML += dropdownItem;
  });
}

/**
 * Initialisiert das Kategorien-Dropdown im Header
 * und registriert alle benötigten Event-Listener.
 *
 * @function initKategorienDropdown
 */
function initKategorienDropdown() {
  const toggleButton = document.getElementById('kategorienDropdownToggle');
  const dropdownMenu = document.getElementById('kategorien-dropdown-list');

  if (!toggleButton || !dropdownMenu) {
    return;
  }

  if (toggleButton.dataset.dropdownInitialized === 'true') {
    return;
  }

  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  dropdownMenu.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) {
      setzeNavigationsflag();
    }
    event.stopPropagation();
  });

  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  toggleButton.dataset.dropdownInitialized = 'true';
}

/**
 * Lädt die Kategorien nach dem Aufbau des DOM.
 */
document.addEventListener('DOMContentLoaded', loadKategorien);

/**
 * Lädt die Kategorien erneut, nachdem Header und Footer
 * dynamisch eingefügt wurden (z. B. für das Dropdown-Menü).
 */
document.addEventListener('includesLoaded', loadKategorien);