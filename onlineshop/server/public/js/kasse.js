/*
  Datei: kasse.js
  Beschreibung: Diese Datei steuert die Kassen-Seite.
    Sie lädt:
    - die Session des aktuell eingeloggten Benutzers
    - die hinterlegte Adresse des Benutzers
    - den aktuellen Warenkorb
    Zusätzlich ermöglicht sie:
    - das Umschalten zwischen hinterlegter und abweichender Lieferadresse
    - die Auswahl der Zahlungsmethode
    - das Absenden der Bestellung
  Hinweise: Verwendet für den Login-Schutz die zentrale Auth-Logik aus auth.js
    sowie die zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

let eingeloggterBenutzer = null;
let standardAdresse = null;
let warenkorbDaten = null;

// Initialisiert die Kassen-Seite nach dem Aufbau des DOM
document.addEventListener('DOMContentLoaded', async () => {
  registriereEvents();
  await initialisiereKasse();
});

/**
 * Registriert alle benötigten Event-Listener
 * für die Kassen-Seite.
 *
 * @function registriereEvents
 */
function registriereEvents() {
  const checkbox = document.getElementById('abweichende-lieferadresse-checkbox');
  const bestellungAbsendenButton = document.getElementById('bestellung-absenden-button');

  if (checkbox) {
    checkbox.addEventListener('change', aktualisiereAdressModus);
  }

  if (bestellungAbsendenButton) {
    bestellungAbsendenButton.addEventListener('click', bestellungAbsenden);
  }
}

/**
 * Führt die Initialisierung der Kassen-Seite aus.
 * Lädt Benutzer, Adresse und Warenkorb
 * und setzt anschließend den Adressmodus korrekt.
 *
 * @async
 * @function initialisiereKasse
 * @returns {Promise<void>}
 */
async function initialisiereKasse() {
  try {
    await ladeSession();
    await ladeBenutzerAdresse();
    await ladeWarenkorb();
    aktualisiereAdressModus();
  } catch (error) {
    console.error('Fehler bei der Initialisierung der Kasse:', error);
    zeigeFehler('kasse-meldung', error.message || 'Kassenseite konnte nicht geladen werden.');
  }
}

/**
 * Lädt die Session des aktuell eingeloggten Benutzers
 * und füllt die Basisdaten im Formular vor.
 *
 * @async
 * @function ladeSession
 * @returns {Promise<void>}
 */
async function ladeSession() {
  eingeloggterBenutzer = await requireLogin('/static/login.html');

  setInputValue('vorname', eingeloggterBenutzer.vorname || '');
  setInputValue('nachname', eingeloggterBenutzer.nachname || '');
  setInputValue('email', eingeloggterBenutzer.email || '');
}

/**
 * Lädt die hinterlegte Standardadresse des Benutzers
 * und trägt sie in das Formular ein.
 *
 * @async
 * @function ladeBenutzerAdresse
 * @returns {Promise<void>}
 */
async function ladeBenutzerAdresse() {
  if (!eingeloggterBenutzer || !eingeloggterBenutzer.id) {
    throw new Error('Benutzerdaten konnten nicht geladen werden.');
  }

  const response = await fetch(`/adresse/${eingeloggterBenutzer.id}`, {
    method: 'GET',
    credentials: 'same-origin'
  });

  if (!response.ok) {
    throw new Error('Adresse konnte nicht geladen werden.');
  }

  const adressen = await response.json();

  if (Array.isArray(adressen) && adressen.length > 0) {
    standardAdresse = adressen[0];
    fuelleAdressdatenInsFormular(standardAdresse, {
      mitTelefon: true,
      mitEmail: false,
      mitVorname: false,
      mitNachname: false
    });
  }
}

/**
 * Schaltet zwischen hinterlegter Standardadresse
 * und abweichender Lieferadresse um.
 *
 * @function aktualisiereAdressModus
 */
function aktualisiereAdressModus() {
  const checkbox = document.getElementById('abweichende-lieferadresse-checkbox');

  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    leereAdressdatenImFormular({
      mitTelefon: true,
      mitEmail: false,
      mitVorname: false,
      mitNachname: false
    });
  } else {
    fuelleAdressdatenInsFormular(standardAdresse, {
      mitTelefon: true,
      mitEmail: false,
      mitVorname: false,
      mitNachname: false
    });
  }
}

/**
 * Lädt den aktuellen Warenkorb des Benutzers
 * und rendert die Bestellübersicht.
 *
 * @async
 * @function ladeWarenkorb
 * @returns {Promise<void>}
 */
async function ladeWarenkorb() {
  const ladeanzeige = document.getElementById('kasse-ladeanzeige');
  const positionenContainer = document.getElementById('kasse-positionen');

  if (ladeanzeige) {
    ladeanzeige.style.display = '';
  }

  if (positionenContainer) {
    positionenContainer.style.display = 'none';
    positionenContainer.innerHTML = '';
  }

  const response = await fetch('/warenkorb', {
    method: 'GET',
    credentials: 'same-origin'
  });

  if (response.status === 401) {
    weiterleiten('/static/login.html');
    throw new Error('Nicht eingeloggt');
  }

  if (!response.ok) {
    throw new Error('Warenkorb konnte nicht geladen werden.');
  }

  warenkorbDaten = await response.json();
  renderBestelluebersicht(warenkorbDaten);
}

/**
 * Rendert die Bestellübersicht in der rechten Spalte der Kassen-Seite.
 *
 * @function renderBestelluebersicht
 * @param {Object} data - Warenkorb- und Summendaten
 */
function renderBestelluebersicht(data) {
  const ladeanzeige = document.getElementById('kasse-ladeanzeige');
  const positionenContainer = document.getElementById('kasse-positionen');

  if (ladeanzeige) {
    ladeanzeige.style.display = 'none';
  }

  const positionen = Array.isArray(data.positionen) ? data.positionen : [];

  if (positionenContainer) {
    positionenContainer.style.display = '';

    if (positionen.length === 0) {
      positionenContainer.innerHTML = `
        <p class="text-muted mb-0">Dein Warenkorb ist leer.</p>
      `;
    } else {
      positionenContainer.innerHTML = positionen.map((position) => `
        <div class="mb-3 pb-3 border-bottom">
          <div class="d-flex justify-content-between align-items-start gap-3">
            <div>
              <p class="fw-semibold mb-1">${escapeHtml(position.bezeichnung)}</p>
              <p class="text-muted small mb-0">
                ${position.anzahl} × ${formatPreis(position.einzelpreis)}
              </p>
            </div>
            <div class="text-end">
              <strong>${formatPreis(position.gesamtpreis)}</strong>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  const zusammenfassung = data.zusammenfassung || {
    artikelanzahl: 0,
    zwischensumme: 0,
    versand: 0,
    gesamtsumme: 0
  };

  setzeText('kasse-artikelanzahl', zusammenfassung.artikelanzahl ?? 0);
  setzeText('kasse-zwischensumme', formatPreis(zusammenfassung.zwischensumme ?? 0));
  setzeText('kasse-versand', formatPreis(zusammenfassung.versand ?? 0));
  setzeText('kasse-gesamtsumme', formatPreis(zusammenfassung.gesamtsumme ?? 0));
}

/**
 * Prüft die Eingaben, erstellt die Bestellung
 * und sendet sie an das Backend.
 *
 * @async
 * @function bestellungAbsenden
 * @returns {Promise<void>}
 */
async function bestellungAbsenden() {
  const agbCheckbox = document.getElementById('agb-checkbox');
  const bestellungAbsendenButton = document.getElementById('bestellung-absenden-button');

  entferneMeldung('kasse-meldung');

  if (!agbCheckbox || !agbCheckbox.checked) {
    zeigeFehler('kasse-meldung', 'Bitte akzeptiere die AGB und Datenschutzbestimmungen.');
    return;
  }

  if (!warenkorbDaten || !Array.isArray(warenkorbDaten.positionen) || warenkorbDaten.positionen.length === 0) {
    zeigeFehler('kasse-meldung', 'Dein Warenkorb ist leer.');
    return;
  }

  const zahlungsmethode = leseZahlungsmethode();

  if (!zahlungsmethode) {
    zeigeFehler('kasse-meldung', 'Bitte wähle eine Zahlungsmethode aus.');
    return;
  }

  try {
    if (bestellungAbsendenButton) {
      bestellungAbsendenButton.disabled = true;
    }

    const lieferadresseId = await ermittleLieferadresseId();
    const positionen = erstelleBestellpositionen();

    const payload = {
      benutzer_id: eingeloggterBenutzer.id,
      lieferadresse_id: lieferadresseId,
      zahlungsmethode,
      positionen
    };

    const response = await fetch('/bestellung', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(payload)
    });

    let data = {};

    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (response.status === 401) {
      weiterleiten('/static/login.html');
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Bestellung konnte nicht abgeschlossen werden.');
    }

    zeigeErfolg('kasse-meldung', data.message || 'Deine Bestellung wurde erfolgreich aufgegeben.');

    window.setTimeout(() => {
      weiterleiten(`/static/bestellungAbgeschlossen.html?bestellung=${data.bestellung_id}`);
    }, 1500);
  } catch (error) {
    console.error('Fehler beim Absenden der Bestellung:', error);
    zeigeFehler('kasse-meldung', error.message || 'Serverfehler beim Absenden der Bestellung.');
  } finally {
    if (bestellungAbsendenButton) {
      bestellungAbsendenButton.disabled = false;
    }
  }
}

/**
 * Ermittelt die für die Bestellung zu verwendende Lieferadresse.
 * Nutzt entweder die Standardadresse oder legt eine neue Adresse an.
 *
 * @async
 * @function ermittleLieferadresseId
 * @returns {Promise<number|string>}
 */
async function ermittleLieferadresseId() {
  const checkbox = document.getElementById('abweichende-lieferadresse-checkbox');

  if (!eingeloggterBenutzer || !eingeloggterBenutzer.id) {
    throw new Error('Benutzer nicht gefunden.');
  }

  if (!checkbox || !checkbox.checked) {
    if (!standardAdresse || !standardAdresse.id) {
      throw new Error('Keine hinterlegte Lieferadresse gefunden.');
    }

    return standardAdresse.id;
  }

  const neueAdresse = leseLieferadresseAusFormular();

  if (!istLieferadresseGueltig(neueAdresse)) {
    throw new Error('Bitte fülle alle Pflichtfelder der Lieferadresse aus.');
  }

  const response = await fetch('/adresse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      benutzer_id: eingeloggterBenutzer.id,
      strasse: neueAdresse.strasse,
      hausnummer: neueAdresse.hausnummer,
      adresszusatz: neueAdresse.adresszusatz,
      postleitzahl: neueAdresse.postleitzahl,
      ort: neueAdresse.ort,
      land: neueAdresse.land
    })
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'Neue Lieferadresse konnte nicht gespeichert werden.');
  }

  return data.id;
}

/**
 * Erstellt die Bestellpositionen aus den aktuellen Warenkorbdaten.
 *
 * @function erstelleBestellpositionen
 * @returns {Array<Object>} Liste der Bestellpositionen
 */
function erstelleBestellpositionen() {
  if (!warenkorbDaten || !Array.isArray(warenkorbDaten.positionen)) {
    return [];
  }

  return warenkorbDaten.positionen.map((position) => ({
    artikel_id: position.artikel_id,
    anzahl: position.anzahl
  }));
}

/**
 * Liest die Lieferadresse aus dem Formular aus.
 *
 * @function leseLieferadresseAusFormular
 * @returns {Object} Lieferadressdaten aus dem Formular
 */
function leseLieferadresseAusFormular() {
  return liesAdressdatenAusFormular({
    mitTelefon: true,
    mitEmail: true,
    mitVorname: true,
    mitNachname: true
  });
}

/**
 * Prüft, ob alle Pflichtfelder der Lieferadresse ausgefüllt sind.
 *
 * @function istLieferadresseGueltig
 * @param {Object} lieferadresse - Zu prüfende Lieferadresse
 * @returns {boolean} True, wenn alle Pflichtfelder vorhanden sind
 */
function istLieferadresseGueltig(lieferadresse) {
  return Boolean(
    lieferadresse.vorname &&
    lieferadresse.nachname &&
    lieferadresse.email &&
    lieferadresse.strasse &&
    lieferadresse.hausnummer &&
    lieferadresse.postleitzahl &&
    lieferadresse.ort &&
    lieferadresse.land
  );
}

/**
 * Liest die aktuell ausgewählte Zahlungsmethode aus.
 *
 * @function leseZahlungsmethode
 * @returns {string} Gewählte Zahlungsmethode oder leerer String
 */
function leseZahlungsmethode() {
  const ausgewaehlt = document.querySelector('input[name="zahlungsmethode"]:checked');
  return ausgewaehlt ? ausgewaehlt.value : '';
}

/**
 * Setzt den Textinhalt eines HTML-Elements, falls es existiert.
 *
 * @function setzeText
 * @param {string} elementId - ID des Zielelements
 * @param {string|number} text - Anzuzeigender Text
 */
function setzeText(elementId, text) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = text;
  }
}