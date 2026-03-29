/**
 * Diese Datei steuert die "Mein Konto"-Seite.
 * Beim Laden werden die Kontodaten und Bestellungen des eingeloggten Benutzers
 * vom Server geholt und dargestellt. Über den Bearbeiten-Button wechselt die Seite
 * in ein Formular, in dem Name, E-Mail, Adresse und optional das Passwort geändert
 * werden können. Jede Bestellung kann aufgeklappt werden, um die bestellten Artikel
 * mit Bild, Name, Anzahl und Preisen anzuzeigen.
 */

'use strict';

// Speichert die zuletzt geladenen Kontodaten – wird beim Abbrechen zum Zurücksetzen genutzt
let urspruenglicheDaten = null;

// Warten bis das HTML vollständig geladen ist
document.addEventListener('DOMContentLoaded', () => {
  // Referenzen auf alle relevanten DOM-Elemente holen
  const bearbeitenButton = document.getElementById('bearbeiten-button');
  const kontoForm = document.getElementById('konto-form');
  const anzeigeBereich = document.getElementById('anzeige-bereich');
  const abbrechenButton = document.getElementById('abbrechen-button');
  const meldung = document.getElementById('meldung');

  // Kontodaten beim Laden der Seite sofort abrufen
  ladeKontodaten();

  // Bearbeiten-Button: Formular einblenden, Anzeigebereich ausblenden
  bearbeitenButton.addEventListener('click', () => {
    kontoForm.style.display = 'block';
    anzeigeBereich.style.display = 'none';
    bearbeitenButton.style.display = 'none';
    meldung.textContent = '';
  });

  // Abbrechen-Button: Formular mit ursprünglichen Daten befüllen und zurück in den Anzeigemodus
  abbrechenButton.addEventListener('click', () => {
    if (!urspruenglicheDaten) {
      return;
    }

    fuelleFormular(urspruenglicheDaten);
    fuelleAnzeige(urspruenglicheDaten);
    wechsleInAnzeigemodus();
  });

  // Formular absenden: Daten validieren und per PUT an den Server schicken
  kontoForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    meldung.textContent = '';
    meldung.className = 'mt-4 text-center';

    const neuesPasswort = document.getElementById('neues-passwort').value;
    const passwortBestaetigen = document.getElementById('passwort-bestaetigen').value;

    // Passwort-Regel: mind. 8 Zeichen, ein Großbuchstabe, eine Zahl, ein Sonderzeichen
    const passwortRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

    // Passwortänderung nur prüfen, wenn mindestens ein Passwortfeld ausgefüllt wurde
    if (neuesPasswort || passwortBestaetigen) {
      if (!neuesPasswort || !passwortBestaetigen) {
        meldung.textContent = 'Bitte beide Passwortfelder ausfüllen.';
        meldung.classList.add('text-danger');
        return;
      }

      // Prüfen ob beide Passwörter übereinstimmen
      if (neuesPasswort !== passwortBestaetigen) {
        meldung.textContent = 'Die Passwörter stimmen nicht überein.';
        meldung.classList.add('text-danger');
        return;
      }

      // Passwort gegen die Sicherheitsregel prüfen
      if (!passwortRegex.test(neuesPasswort)) {
        meldung.textContent = 'Das neue Passwort muss mindestens 8 Zeichen lang sein und mindestens einen Großbuchstaben, eine Zahl und ein Sonderzeichen enthalten.';
        meldung.classList.add('text-danger');
        return;
      }
    }

    // Alle geänderten Felder aus dem Formular auslesen
    const daten = {
      vorname: document.getElementById('vorname').value.trim(),
      nachname: document.getElementById('nachname').value.trim(),
      email: document.getElementById('email').value.trim(),
      strasse: document.getElementById('strasse').value.trim(),
      hausnummer: document.getElementById('hausnummer').value.trim(),
      adresszusatz: document.getElementById('adresszusatz').value.trim(),
      postleitzahl: document.getElementById('postleitzahl').value.trim(),
      ort: document.getElementById('ort').value.trim(),
      land: document.getElementById('land').value.trim(),
      neuesPasswort: neuesPasswort // leer = kein Passwortwechsel
    };

    try {
      // Änderungen per PUT-Request an den Server senden
      const response = await fetch('/benutzer/mein-konto', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(daten)
      });

      const ergebnis = await response.json();

      if (!response.ok) {
        meldung.textContent = ergebnis.message || 'Änderungen konnten nicht gespeichert werden.';
        meldung.classList.add('text-danger');
        return;
      }

      meldung.textContent = 'Änderungen erfolgreich gespeichert.';
      meldung.classList.add('text-success');

      // Kontodaten neu laden, damit Anzeige und urspruenglicheDaten aktuell sind
      await ladeKontodaten();

      wechsleInAnzeigemodus();

    } catch (error) {
      console.error('Fehler beim Speichern:', error);
      meldung.textContent = 'Serverfehler beim Speichern.';
      meldung.classList.add('text-danger');
    }
  });
});

// Lädt die Kontodaten des eingeloggten Benutzers vom Server
async function ladeKontodaten() {
  const meldung = document.getElementById('meldung');

  try {
    // GET-Request an den Server – Session-Cookie wird automatisch mitgeschickt
    const response = await fetch('/benutzer/mein-konto', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      // Nicht eingeloggt: zur Login-Seite weiterleiten
      if (response.status === 401) {
        window.location.href = '/static/login.html';
        return;
      }

      throw new Error('Kontodaten konnten nicht geladen werden.');
    }

    const daten = await response.json();

    // Daten zwischenspeichern für späteres Zurücksetzen beim Abbrechen
    urspruenglicheDaten = daten;

    setzeBegruessung(daten);
    fuelleAnzeige(daten);
    fuelleFormular(daten);
    await ladeBestellungen();
  } catch (error) {
    console.error('Fehler beim Laden der Kontodaten:', error);
    meldung.textContent = 'Kontodaten konnten nicht geladen werden.';
    meldung.className = 'mt-4 text-center text-danger';
  }
}

// Setzt die Begrüßung oben auf der Seite mit dem Vornamen des Benutzers
function setzeBegruessung(daten) {
  const begruessung = document.getElementById('konto-begruessung');
  begruessung.textContent = `Hallo, ${daten.vorname}`;
}

// Befüllt den Anzeigebereich mit den aktuellen Kontodaten
// Fallback auf '-' falls ein Feld leer ist
function fuelleAnzeige(daten) {
  document.getElementById('anzeige-vorname').textContent = daten.vorname || '-';
  document.getElementById('anzeige-nachname').textContent = daten.nachname || '-';
  document.getElementById('anzeige-email').textContent = daten.email || '-';
  document.getElementById('anzeige-strasse').textContent = daten.strasse || '-';
  document.getElementById('anzeige-hausnummer').textContent = daten.hausnummer || '-';
  document.getElementById('anzeige-adresszusatz').textContent = daten.adresszusatz || '-';
  document.getElementById('anzeige-postleitzahl').textContent = daten.postleitzahl || '-';
  document.getElementById('anzeige-ort').textContent = daten.ort || '-';
  document.getElementById('anzeige-land').textContent = daten.land || '-';
}

// Befüllt das Bearbeitungsformular mit den aktuellen Kontodaten
function fuelleFormular(daten) {
  document.getElementById('vorname').value = daten.vorname || '';
  document.getElementById('nachname').value = daten.nachname || '';
  document.getElementById('email').value = daten.email || '';
  document.getElementById('strasse').value = daten.strasse || '';
  document.getElementById('hausnummer').value = daten.hausnummer || '';
  document.getElementById('adresszusatz').value = daten.adresszusatz || '';
  document.getElementById('postleitzahl').value = daten.postleitzahl || '';
  document.getElementById('ort').value = daten.ort || '';
  document.getElementById('land').value = daten.land || '';
}

// Wechselt zurück in den Anzeigemodus und setzt das Formular zurück
function wechsleInAnzeigemodus() {
  const bearbeitenButton = document.getElementById('bearbeiten-button');
  const kontoForm = document.getElementById('konto-form');
  const anzeigeBereich = document.getElementById('anzeige-bereich');
  const meldung = document.getElementById('meldung');

  kontoForm.style.display = 'none';
  anzeigeBereich.style.display = 'block';
  bearbeitenButton.style.display = 'inline-block';

  // Passwortfelder leeren, damit sie beim nächsten Bearbeiten leer sind
  document.getElementById('neues-passwort').value = '';
  document.getElementById('passwort-bestaetigen').value = '';

  meldung.textContent = '';
  meldung.className = 'mt-4 text-center';
}

async function ladeBestellungen() {
  const container = document.getElementById('bestellungen-container');

  try {
    // Bestellungen des eingeloggten Benutzers vom Server laden
    const response = await fetch('/benutzer/meine-bestellungen', {
      method: 'GET',
      credentials: 'same-origin'
    });

    if (!response.ok) {
      // Nicht eingeloggt: zur Login-Seite weiterleiten
      if (response.status === 401) {
        window.location.href = '/static/login.html';
        return;
      }

      throw new Error('Bestellungen konnten nicht geladen werden.');
    }

    const bestellungen = await response.json();
    zeigeBestellungen(bestellungen);
  } catch (error) {
    console.error('Fehler beim Laden der Bestellungen:', error);
    container.innerHTML = '<p class="text-danger mb-0">Bestellungen konnten nicht geladen werden.</p>';
  }
}

// Rendert alle Bestellungen als aufklappbare Karten im Container
function zeigeBestellungen(bestellungen) {
  const container = document.getElementById('bestellungen-container');

  // Keine Bestellungen vorhanden: Hinweistext anzeigen
  if (!bestellungen || bestellungen.length === 0) {
    container.innerHTML = '<p class="text-muted mb-0">Sie haben noch keine Bestellungen.</p>';
    return;
  }

  container.innerHTML = bestellungen.map((bestellung) => {
    // Datum, Preis und Adresse für die Anzeige formatieren
    const datum = formatiereDatum(bestellung.erstellungszeitpunkt);
    const preis = formatierePreis(bestellung.gesamtpreis);
    const adresse = formatiereAdresse(bestellung);

    return `
      <div class="card mb-3 border">

        <!-- Klickbarer Kopfbereich – öffnet/schließt die Artikeldetails -->
        <div class="card-body" style="cursor: pointer;" onclick="toggleBestellungDetails(${bestellung.id})">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h3 class="h5 mb-0">Bestellung #${bestellung.id}</h3>
            <i class="bi bi-chevron-down" id="chevron-${bestellung.id}"></i>
          </div>

          <div class="row g-3">
            <div class="col-md-4">
              <strong>Bestellstatus:</strong>
              <p class="mb-0">${bestellung.bestellstatus}</p>
            </div>

            <div class="col-md-4">
              <strong>Lieferadresse:</strong>
              <p class="mb-0">${adresse}</p>
            </div>

            <div class="col-md-4">
              <strong>Erstellt am:</strong>
              <p class="mb-0">${datum}</p>
            </div>

            <div class="col-md-4">
              <strong>Zahlungsstatus:</strong>
              <p class="mb-0">${bestellung.zahlungsstatus}</p>
            </div>

            <div class="col-md-4">
              <strong>Zahlungsmethode:</strong>
              <p class="mb-0">${bestellung.zahlungsmethode}</p>
            </div>

            <div class="col-md-4">
              <strong>Gesamtpreis:</strong>
              <p class="mb-0">${preis}</p>
            </div>
          </div>
        </div>

        <!-- Aufklappbarer Bereich mit Artikeldetails (standardmäßig versteckt) -->
        <div id="details-${bestellung.id}" style="display: none;">
          <div class="card-body border-top" id="details-inhalt-${bestellung.id}">
            <p class="text-muted mb-0">Wird geladen...</p>
          </div>
        </div>

      </div>
    `;
  }).join('');
}

// Wandelt einen Datums-String in deutsches Format um (z.B. "29.03.2026")
function formatiereDatum(datumString) {
  const datum = new Date(datumString);

  return datum.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Formatiert einen Preis als deutschen Währungsbetrag (z.B. "29,98 €")
function formatierePreis(preis) {
  return Number(preis).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });
}

// Öffnet oder schließt die Artikeldetails einer Bestellung
// Beim ersten Öffnen werden die Daten vom Server geladen
async function toggleBestellungDetails(bestellungId) {
  const detailsDiv = document.getElementById(`details-${bestellungId}`);
  const chevron = document.getElementById(`chevron-${bestellungId}`);
  const inhalt = document.getElementById(`details-inhalt-${bestellungId}`);

  if (detailsDiv.style.display === 'none') {
    // Aufklappen
    detailsDiv.style.display = 'block';
    chevron.classList.replace('bi-chevron-down', 'bi-chevron-up');

    // Artikel nur laden, wenn noch nicht geladen
    if (inhalt.dataset.geladen !== 'true') {
      try {
        const response = await fetch(`/bestellung/${bestellungId}`, {
          credentials: 'same-origin'
        });

        if (!response.ok) throw new Error('Fehler beim Laden');

        const daten = await response.json();
        zeigeBestellungsPositionen(inhalt, daten.positionen);
        inhalt.dataset.geladen = 'true';
      } catch (error) {
        inhalt.innerHTML = '<p class="text-danger mb-0">Artikel konnten nicht geladen werden.</p>';
      }
    }
  } else {
    // Zuklappen
    detailsDiv.style.display = 'none';
    chevron.classList.replace('bi-chevron-up', 'bi-chevron-down');
  }
}

// Zeigt die bestellten Artikel mit Bild, Name, Anzahl und Preisen an
function zeigeBestellungsPositionen(container, positionen) {
  if (!positionen || positionen.length === 0) {
    container.innerHTML = '<p class="text-muted mb-0">Keine Artikel gefunden.</p>';
    return;
  }

  container.innerHTML = `
    <h4 class="h6 mb-3">Bestellte Artikel</h4>
    <div class="row g-3">
      ${positionen.map(pos => `
        <div class="col-md-6 d-flex gap-3 align-items-start">
          <img src="/static/${pos.bild_url}" alt="${pos.artikel}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 6px;">
          <div>
            <a href="/static/artikel.html?id=${pos.artikel_id}" class="fw-bold text-decoration-none text-dark">${pos.artikel}</a>
            <p class="mb-0 text-muted">Anzahl: ${pos.anzahl}</p>
            <p class="mb-0 text-muted">Einzelpreis: ${formatierePreis(pos.einzelpreis)}</p>
            <p class="mb-0">Gesamtpreis: ${formatierePreis(pos.gesamtpreis)}</p>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Setzt die Lieferadresse aus den einzelnen Feldern zu einem lesbaren String zusammen
// Adresszusatz wird nur eingefügt, wenn er vorhanden ist
function formatiereAdresse(bestellung) {
  let adresse = `${bestellung.strasse} ${bestellung.hausnummer}`;

  if (bestellung.adresszusatz) {
    adresse += `, ${bestellung.adresszusatz}`;
  }

  adresse += `, ${bestellung.postleitzahl} ${bestellung.ort}, ${bestellung.land}`;

  return adresse;
}