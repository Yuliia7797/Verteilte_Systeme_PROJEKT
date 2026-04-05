/*
  Datei: suche.js
  Beschreibung: Diese Datei verarbeitet das Suchformular im Header.
    Wenn der Benutzer einen Suchbegriff eingibt und auf "Suchen" klickt,
    wird er zur Suchseite weitergeleitet. Der Suchbegriff wird als URL-Parameter übergeben.
    Beispiel: /static/suche.html?q=Harry
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

function initSucheFormular() {
  /*
    Suchformular und Eingabefeld im Header suchen.
  */
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');

  /*
    Falls das Formular oder das Eingabefeld nicht existiert,
    Funktion sofort beenden.
  */
  if (!searchForm || !searchInput) {
    return;
  }

  /*
    Verhindern, dass der Event-Listener mehrfach gesetzt wird.
    Das ist wichtig, weil der Header dynamisch geladen wird.
  */
  if (searchForm.dataset.initialized === 'true') {
    return;
  }

  /*
    Reagieren, wenn das Formular abgeschickt wird.
  */
  searchForm.addEventListener('submit', (event) => {
    /*
      Standardverhalten des Formulars verhindern.
    */
    event.preventDefault();

    /*
      Eingegebenen Suchbegriff lesen und Leerzeichen entfernen.
    */
    const suchbegriff = searchInput.value.trim();

    /*
      Falls nichts eingegeben wurde, nichts tun.
    */
    if (!suchbegriff) {
      return;
    }

    /*
      Zur Suchergebnisseite weiterleiten.
      Der Suchbegriff wird in der URL übergeben.
    */
    weiterleiten(`/static/suche.html?q=${encodeURIComponent(suchbegriff)}`);
  });

  /*
    Markieren, dass das Formular bereits initialisiert wurde.
  */
  searchForm.dataset.initialized = 'true';
}

/*
  Initialisierung nach dem normalen Laden der Seite.
*/
document.addEventListener('DOMContentLoaded', initSucheFormular);

/*
  Initialisierung nachdem Header/Footer dynamisch eingefügt wurden.
*/
document.addEventListener('includesLoaded', initSucheFormular);