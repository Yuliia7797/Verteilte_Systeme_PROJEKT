/*
  Datei: suche-ergebnisse.js
  Beschreibung: Diese Datei steuert die Suchergebnisseite.
    Der Suchbegriff wird aus dem URL-Parameter ausgelesen, an das Backend gesendet
    und die passenden Artikel werden als Cards angezeigt.
    Bei fehlendem Suchbegriff oder keinen Treffern wird eine entsprechende Meldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/


/*
  Diese Funktion liest den Suchbegriff aus der URL.

  Beispiel:
  suche.html?q=Harry

  Dann wird "Harry" ausgelesen.
*/
function getSuchbegriffFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('q');
}

/*
  Diese Funktion zeigt oberhalb der Ergebnisse an,
  wonach gesucht wurde.
*/
function renderSuchbegriff(suchbegriff) {
  const suchbegriffAnzeige = document.getElementById('suchbegriff-anzeige');

  /*
    Falls das Element nicht existiert, Funktion beenden.
  */
  if (!suchbegriffAnzeige) {
    return;
  }

  /*
    Falls kein Suchbegriff vorhanden ist,
    Hinweistext anzeigen.
  */
  if (!suchbegriff) {
    suchbegriffAnzeige.textContent = 'Bitte gib einen Suchbegriff ein.';
    return;
  }

  /*
    Den aktuellen Suchbegriff auf der Seite anzeigen.
  */
  suchbegriffAnzeige.textContent = `Ergebnisse für: "${suchbegriff}"`;
}

/*
  Diese Funktion erstellt die HTML-Karte
  für einen gefundenen Artikel.
*/
function createSuchArtikelCard(artikelItem) {
  return `
    <div class="col-md-4">
      <div class="card h-100">
        <a href="/static/artikel.html?id=${artikelItem.id}">
          <img
            src="${artikelItem.bild_url}"
            alt="${artikelItem.bezeichnung}"
            class="card-img-top"
          >
        </a>

        <div class="card-body d-flex flex-column">
          <h5 class="card-title">${artikelItem.bezeichnung}</h5>
          <p class="card-text">${artikelItem.beschreibung || ''}</p>
          <p class="fw-bold mt-auto">${Number(artikelItem.preis).toFixed(2)} €</p>

          <a href="/static/artikel.html?id=${artikelItem.id}" class="btn btn-main">
            Zum Artikel
          </a>
        </div>
      </div>
    </div>
  `;
}

/*
  Diese Funktion zeigt alle gefundenen Artikel an.
*/
function renderSuchergebnisse(artikelListe) {
  const container = document.getElementById('suche-artikel-container');

  /*
    Falls der Container nicht existiert, Funktion beenden.
  */
  if (!container) {
    return;
  }

  /*
    Alten Inhalt löschen.
  */
  container.innerHTML = '';

  /*
    Falls keine Artikel gefunden wurden,
    entsprechende Meldung anzeigen.
  */
  if (!artikelListe || artikelListe.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine passenden Artikel gefunden.</p>
      </div>
    `;
    return;
  }

  /*
    Für jeden gefundenen Artikel eine Karte erzeugen.
  */
  artikelListe.forEach((artikelItem) => {
    container.innerHTML += createSuchArtikelCard(artikelItem);
  });
}

/*
  Diese Funktion zeigt eine Fehlermeldung auf der Seite an.
*/
function renderSucheFehler(fehlermeldung) {
  const container = document.getElementById('suche-artikel-container');

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger text-center">
        ${fehlermeldung}
      </div>
    </div>
  `;
}

/*
  Diese Funktion lädt die Suchergebnisse vom Backend.
*/
async function loadSuchergebnisse() {
  try {
    /*
      Suchbegriff aus der URL lesen.
    */
    const suchbegriff = getSuchbegriffFromUrl();

    /*
      Suchbegriff oberhalb der Ergebnisse anzeigen.
    */
    renderSuchbegriff(suchbegriff);

    /*
      Falls kein Suchbegriff vorhanden ist,
      Fehlermeldung anzeigen.
    */
    if (!suchbegriff) {
      renderSucheFehler('Kein Suchbegriff wurde übergeben.');
      return;
    }

    /*
      Suchanfrage an das Backend senden.
      Der Backend-Route /artikel kann bereits mit ?suche=... umgehen.
    */
    const response = await fetch(`/artikel?suche=${encodeURIComponent(suchbegriff)}`);

    /*
      Prüfen, ob die Antwort erfolgreich war.
    */
    if (!response.ok) {
      throw new Error('Suchergebnisse konnten nicht geladen werden');
    }

    /*
      JSON-Daten in JavaScript-Objekte umwandeln.
    */
    const artikelListe = await response.json();

    /*
      Ergebnisse auf der Seite anzeigen.
    */
    renderSuchergebnisse(artikelListe);
  } catch (error) {
    console.error('Fehler beim Laden der Suchergebnisse:', error);
    renderSucheFehler('Die Suchergebnisse konnten nicht geladen werden.');
  }
}

/*
  Nach dem Laden der Seite die Suchergebnisse abrufen.
*/
document.addEventListener('DOMContentLoaded', loadSuchergebnisse);