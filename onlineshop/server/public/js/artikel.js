/**
 * Diese Datei steuert die Artikelübersicht auf der Startseite des Onlineshops.
 * Beim Laden der Seite werden alle verfügbaren Artikel per GET-Request vom Backend geladen
 * und dynamisch als Karten (Cards) in den Artikelcontainer der Seite eingefügt.
 * Jede Karte zeigt Bild, Name, Kurzbeschreibung und Preis des Artikels an
 * und verlinkt auf die zugehörige Detailseite.
 * Falls keine Artikel vorhanden sind oder ein Fehler auftritt, wird eine entsprechende
 * Meldung ausgegeben.
 */

/*
  Diese Funktion erstellt die HTML-Karte
  für einen einzelnen Artikel.
*/
function createArtikelCard(artikelItem) {
  /*
    Für jeden Artikel wird eine Karte mit Bild,
    Name, Beschreibung, Preis und Button erstellt.
  */
  return `
    <div class="col-md-4">
      <div class="card h-100">
        <!-- Klick auf das Bild führt zur Artikeldetailseite -->
        <a href="/static/artikel.html?id=${artikelItem.id}">
          <img src="${artikelItem.bild_url}" alt="${artikelItem.bezeichnung}">
        </a>

        <div class="card-body">
          <!-- Klick auf den Artikelnamen führt ebenfalls zur Detailseite -->
          <h5 class="card-title">
            <a href="/static/artikel.html?id=${artikelItem.id}" class="text-decoration-none text-dark">
              ${artikelItem.bezeichnung}
            </a>
          </h5>

          <!-- Kurze Artikelbeschreibung -->
          <p class="card-text">${artikelItem.beschreibung || ''}</p>

          <!-- Preis mit zwei Nachkommastellen -->
          <p class="fw-bold">${Number(artikelItem.preis).toFixed(2)} €</p>

          <!-- Später kann hier die Warenkorb-Funktion ergänzt werden -->
          <a href="#" class="btn btn-main">In den Warenkorb</a>
        </div>
      </div>
    </div>
  `;
}

/*
  Diese Funktion fügt alle geladenen Artikel
  in den Container der Startseite ein.
*/
function renderArtikel(artikel) {
  /* Den Container aus der HTML-Seite holen */
  const container = document.getElementById('artikel-container');

  /* Prüfen, ob der Container im HTML existiert */
  if (!container) {
    console.error('Der Container mit der ID "artikel-container" wurde nicht gefunden.');
    return;
  }

  /*
    Sicherheitshalber alten Inhalt löschen,
    damit keine doppelten Karten angezeigt werden.
  */
  container.innerHTML = '';

  /* Prüfen, ob überhaupt Artikel vorhanden sind */
  if (artikel.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <p class="text-center">Keine Artikel gefunden.</p>
      </div>
    `;
    return;
  }

  /* Über alle Artikel aus der Datenbank laufen */
  artikel.forEach(artikelItem => {
    /* Für jeden Artikel eine Karte erzeugen */
    const card = createArtikelCard(artikelItem);

    /* Die erzeugte Karte in den Container einfügen */
    container.innerHTML += card;
  });
}

/*
  Diese Funktion lädt alle Artikel vom Backend
  und zeigt sie auf der Startseite an.
*/
async function loadArtikel() {
  try {
    /*
      Anfrage an das Backend senden.
      Die Route /artikel liefert alle Artikel als JSON zurück.
    */
    const response = await fetch('/artikel');

    /* Prüfen, ob die Serverantwort erfolgreich war */
    if (!response.ok) {
      throw new Error('Fehler beim Laden der Artikel vom Server');
    }

    /* Antwort in JSON umwandeln */
    const artikel = await response.json();

    /* Alle geladenen Artikel im Container anzeigen */
    renderArtikel(artikel);

  } catch (error) {
    /* Falls beim Laden etwas schiefgeht, Fehler in der Konsole anzeigen */
    console.error('Fehler beim Laden der Artikel:', error);
  }
}

/*
  Warten, bis die komplette HTML-Seite geladen ist.
  Erst danach sollen die Artikel eingefügt werden.
*/
document.addEventListener('DOMContentLoaded', loadArtikel);