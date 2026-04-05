/*
  Datei: kategorien.js
  Beschreibung: Diese Datei lädt alle Kategorien vom Backend und zeigt sie an zwei Stellen an:
    als Karten auf der Startseite und als Einträge im Dropdown-Menü im Header.
    Außerdem wird das Dropdown-Menü initialisiert, sodass es per Klick geöffnet und geschlossen werden kann.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

/*
  Diese Funktion lädt alle Kategorien vom Backend.
  Danach werden die Kategorien auf der Startseite angezeigt
  und zusätzlich in das Dropdown-Menü im Header eingefügt.
*/
async function loadKategorien() {
  try {
    /*
      Anfrage an das Backend senden.
      Der Endpoint /kategorien liefert alle Kategorien als JSON zurück.
    */
    const response = await fetch('/kategorien');

    /* Prüfen, ob die Serverantwort erfolgreich war */
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Kategorien vom Server');
    }

    /* Antwort in JSON umwandeln */
    const kategorien = await response.json();

    /*
      Die Kategorienkarten auf der Startseite anzeigen.
      Falls der Container auf der aktuellen Seite nicht existiert,
      passiert in der Funktion nichts.
    */
    renderKategorienCards(kategorien);

    /*
      Die Kategorien in das Dropdown-Menü im Header einfügen.
      Falls die Dropdown-Liste auf der aktuellen Seite nicht existiert,
      passiert in der Funktion nichts.
    */
    renderKategorienDropdown(kategorien);

    /*
      Das Dropdown-Menü für Kategorien aktivieren.
      So kann es per Klick geöffnet und geschlossen werden.
    */
    initKategorienDropdown();

  } catch (error) {
    /* Falls beim Laden etwas schiefgeht, Fehler in der Konsole anzeigen */
    console.error('Fehler beim Laden der Kategorien:', error);
  }
}

/*
  Diese Funktion zeigt die Kategorienkarten
  auf der Startseite an.
*/
function renderKategorienCards(kategorien) {
  /* Den Container für die Kategorienkarten holen */
  const container = document.getElementById('kategorien-container');

  /*
    Prüfen, ob der Container im HTML existiert.
    Falls nicht, wird die Funktion beendet,
    weil nicht jede Seite Kategorienkarten enthält.
  */
  if (!container) {
    return;
  }

  /* Alten Inhalt löschen, damit keine doppelten Karten angezeigt werden */
  container.innerHTML = '';

  /* Prüfen, ob überhaupt Kategorien vorhanden sind */
  if (kategorien.length === 0) {
    container.innerHTML = '<p>Keine Kategorien gefunden.</p>';
    return;
  }

  /* Über alle Kategorien aus der Datenbank laufen */
  kategorien.forEach(kategorie => {
    /*
      Für jede Kategorie eine HTML-Karte erstellen.
      Der Button führt zur Seite der ausgewählten Kategorie.
    */
    const card = `
      <div class="col-md-3">
        <div class="category-card">
          <h5>${kategorie.bezeichnung}</h5>
          <p>Kategorie aus der Datenbank</p>
          <a href="/static/kategorie.html?id=${kategorie.id}" class="btn btn-sm btn-main">Ansehen</a>
        </div>
      </div>
    `;

    /* Die erzeugte Karte in den Container einfügen */
    container.innerHTML += card;
  });
}

/*
  Diese Funktion zeigt alle Kategorien
  im Dropdown-Menü im Header an.
*/
function renderKategorienDropdown(kategorien) {
  /* Die Liste für das Dropdown-Menü im Header holen */
  const dropdownList = document.getElementById('kategorien-dropdown-list');

  /*
    Prüfen, ob die Dropdown-Liste im HTML existiert.
    Falls nicht, wird die Funktion beendet,
    weil nicht jede Seite den Header bereits geladen haben muss.
  */
  if (!dropdownList) {
    return;
  }

  /* Alten Inhalt löschen, damit keine doppelten Einträge angezeigt werden */
  dropdownList.innerHTML = '';

  /* Prüfen, ob überhaupt Kategorien vorhanden sind */
  if (kategorien.length === 0) {
    dropdownList.innerHTML = `
      <li class="kategorien-dropdown-empty">Keine Kategorien gefunden</li>
    `;
    return;
  }

  /* Über alle Kategorien laufen */
  kategorien.forEach(kategorie => {
    /*
      Für jede Kategorie einen Eintrag im Dropdown-Menü erstellen.
      Der Klick führt zur Seite der ausgewählten Kategorie.
    */
    const dropdownItem = `
      <li>
        <a class="kategorien-dropdown-item" href="/static/kategorie.html?id=${kategorie.id}">
          ${kategorie.bezeichnung}
        </a>
      </li>
    `;

    /* Den erzeugten Eintrag in die Dropdown-Liste einfügen */
    dropdownList.innerHTML += dropdownItem;
  });
}

/*
  Diese Funktion aktiviert das eigene Dropdown-Menü für Kategorien.
  Beim Klick auf "Kategorien" wird das Menü geöffnet oder geschlossen.
*/
function initKategorienDropdown() {
  /* Den Button für das Dropdown-Menü holen */
  const toggleButton = document.getElementById('kategorienDropdownToggle');

  /* Die Liste des Dropdown-Menüs holen */
  const dropdownMenu = document.getElementById('kategorien-dropdown-list');

  /*
    Prüfen, ob beide benötigten Elemente im HTML vorhanden sind.
    Falls nicht, wird die Funktion beendet.
  */
  if (!toggleButton || !dropdownMenu) {
    return;
  }

  /*
    Prüfen, ob das Dropdown bereits initialisiert wurde.
    So wird verhindert, dass Event-Listener mehrfach gesetzt werden.
  */
  if (toggleButton.dataset.dropdownInitialized === 'true') {
    return;
  }

  /*
    Beim Klick auf den Kategorien-Button:
    - Standardverhalten verhindern
    - Klick nicht nach außen weitergeben
    - Dropdown-Menü ein- oder ausblenden
  */
  toggleButton.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    dropdownMenu.classList.toggle('show');
  });

  /*
    Klick innerhalb des Dropdown-Menüs soll das Menü
    nicht sofort wieder schließen.
    Falls auf einen Link geklickt wird, Navigation-Flag setzen,
    da stopPropagation das Bubbling zum document-Listener verhindert.
  */
  dropdownMenu.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) {
      setzeNavigationsflag();
    }
    event.stopPropagation();
  });

  /*
    Klick irgendwo außerhalb des Dropdown-Menüs
    schließt das Menü wieder.
  */
  document.addEventListener('click', () => {
    dropdownMenu.classList.remove('show');
  });

  /*
    Markieren, dass das Dropdown bereits initialisiert wurde.
    So werden die Listener nicht doppelt registriert.
  */
  toggleButton.dataset.dropdownInitialized = 'true';
}

/*
  Beim normalen Laden der HTML-Seite Kategorien laden.
*/
document.addEventListener('DOMContentLoaded', loadKategorien);

/*
  Nachdem Header und Footer dynamisch eingefügt wurden,
  sollen die Kategorien noch einmal geladen werden.
  Das ist wichtig für das Dropdown-Menü im Header.
*/
document.addEventListener('includesLoaded', loadKategorien);