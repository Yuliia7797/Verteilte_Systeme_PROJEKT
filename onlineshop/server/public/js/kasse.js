/**
 * Diese Datei steuert die Kassen-Seite.
 * Sie lädt:
 * - die Session des aktuell eingeloggten Benutzers
 * - die hinterlegte Adresse des Benutzers
 * - den aktuellen Warenkorb
 *
 * Zusätzlich ermöglicht sie:
 * - das Umschalten zwischen hinterlegter und abweichender Lieferadresse
 * - die Auswahl der Zahlungsmethode
 * - das Absenden der Bestellung
 */

'use strict';

let eingeloggterBenutzer = null;
let standardAdresse = null;
let warenkorbDaten = null;

document.addEventListener('DOMContentLoaded', async () => {
  registriereEvents();
  await initialisiereKasse();
});

/*
  Registriert alle benötigten Event-Handler.
*/
function registriereEvents() {
  const checkboxAbweichendeAdresse = document.getElementById('abweichende-lieferadresse-checkbox');
  const bestellungAbsendenButton = document.getElementById('bestellung-absenden-button');

  if (checkboxAbweichendeAdresse) {
    checkboxAbweichendeAdresse.addEventListener('change', () => {
      aktualisiereAdressModus();
    });
  }

  if (bestellungAbsendenButton) {
    bestellungAbsendenButton.addEventListener('click', async () => {
      await bestellungAbsenden();
    });
  }
}

/*
  Lädt alle benötigten Daten für die Kassen-Seite.
*/
async function initialisiereKasse() {
  try {
    await ladeSession();
    await ladeBenutzerAdresse();
    await ladeWarenkorb();
    aktualisiereAdressModus();
  } catch (error) {
    console.error('Fehler beim Initialisieren der Kasse:', error);
    zeigeMeldung(error.message || 'Die Kasse konnte nicht geladen werden.', 'danger');
  }
}

/*
  Lädt die Session des aktuell eingeloggten Benutzers.
*/
async function ladeSession() {
  const response = await fetch('/benutzer/session', {
    method: 'GET',
    credentials: 'same-origin'
  });

  if (response.status === 401 || !response.ok) {
    window.location.href = '/static/login.html';
    throw new Error('Nicht eingeloggt');
  }

  eingeloggterBenutzer = await response.json();

  setzeFeldWert('vorname', eingeloggterBenutzer.vorname || '');
  setzeFeldWert('nachname', eingeloggterBenutzer.nachname || '');
  setzeFeldWert('email', eingeloggterBenutzer.email || '');
}

/*
  Lädt die hinterlegte Adresse des Benutzers.
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
    fuelleAdresseInsFormular(standardAdresse);
  }
}

/*
  Füllt die Adressdaten in das Formular ein.
*/
function fuelleAdresseInsFormular(adresse) {
  if (!adresse) {
    return;
  }

  setzeFeldWert('strasse', adresse.strasse);
  setzeFeldWert('hausnummer', adresse.hausnummer);
  setzeFeldWert('adresszusatz', adresse.adresszusatz);
  setzeFeldWert('postleitzahl', adresse.postleitzahl);
  setzeFeldWert('ort', adresse.ort);
  setzeFeldWert('land', adresse.land);
}

/*
  Leert die Adressfelder im Formular.
*/
function leereAdressFelder() {
  setzeFeldWert('strasse', '');
  setzeFeldWert('hausnummer', '');
  setzeFeldWert('adresszusatz', '');
  setzeFeldWert('postleitzahl', '');
  setzeFeldWert('ort', '');
  setzeFeldWert('land', '');
}

/*
  Setzt den Wert eines Formularfelds.
*/
function setzeFeldWert(feldId, wert) {
  const feld = document.getElementById(feldId);

  if (feld) {
    feld.value = wert || '';
  }
}

/*
  Schaltet zwischen Standardadresse und abweichender Lieferadresse um.
*/
function aktualisiereAdressModus() {
  const checkbox = document.getElementById('abweichende-lieferadresse-checkbox');

  if (!checkbox) {
    return;
  }

  if (checkbox.checked) {
    leereAdressFelder();
  } else {
    fuelleAdresseInsFormular(standardAdresse);
  }
}

/*
  Lädt den aktuellen Warenkorb des Benutzers.
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
    window.location.href = '/static/login.html';
    throw new Error('Nicht eingeloggt');
  }

  if (!response.ok) {
    throw new Error('Warenkorb konnte nicht geladen werden.');
  }

  warenkorbDaten = await response.json();
  renderBestelluebersicht(warenkorbDaten);
}

/*
  Rendert die Bestellübersicht in der rechten Spalte.
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

/*
  Sendet die Bestellung an das Backend.
*/
async function bestellungAbsenden() {
  const agbCheckbox = document.getElementById('agb-checkbox');
  const bestellungAbsendenButton = document.getElementById('bestellung-absenden-button');

  if (!agbCheckbox || !agbCheckbox.checked) {
    zeigeMeldung('Bitte akzeptiere die AGB und Datenschutzbestimmungen.', 'danger');
    return;
  }

  if (!warenkorbDaten || !Array.isArray(warenkorbDaten.positionen) || warenkorbDaten.positionen.length === 0) {
    zeigeMeldung('Dein Warenkorb ist leer.', 'danger');
    return;
  }

  const zahlungsmethode = leseZahlungsmethode();

  if (!zahlungsmethode) {
    zeigeMeldung('Bitte wähle eine Zahlungsmethode aus.', 'danger');
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
    } catch (jsonError) {
      data = {};
    }

    if (response.status === 401) {
      window.location.href = '/static/login.html';
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Bestellung konnte nicht abgeschlossen werden.');
    }

    zeigeMeldung(data.message || 'Deine Bestellung wurde erfolgreich aufgegeben.', 'success');

    window.setTimeout(() => {
     window.location.href = `/static/bestellungAbgeschlossen.html?bestellung=${data.bestellung_id}`;
    }, 1500);

  } catch (error) {
    console.error('Fehler beim Absenden der Bestellung:', error);
    zeigeMeldung(error.message || 'Serverfehler beim Absenden der Bestellung.', 'danger');
  } finally {
    if (bestellungAbsendenButton) {
      bestellungAbsendenButton.disabled = false;
    }
  }
}

/*
  Ermittelt, welche Lieferadresse für die Bestellung verwendet werden soll.
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
  } catch (jsonError) {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data.message || 'Neue Lieferadresse konnte nicht gespeichert werden.');
  }

  return data.id;
}

/*
  Erstellt die Bestellpositionen aus dem Warenkorb.
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

/*
  Liest die Lieferadresse aus dem Formular aus.
*/
function leseLieferadresseAusFormular() {
  return {
    vorname: leseFeldwert('vorname'),
    nachname: leseFeldwert('nachname'),
    email: leseFeldwert('email'),
    telefon: leseFeldwert('telefon'),
    strasse: leseFeldwert('strasse'),
    hausnummer: leseFeldwert('hausnummer'),
    adresszusatz: leseFeldwert('adresszusatz'),
    postleitzahl: leseFeldwert('postleitzahl'),
    ort: leseFeldwert('ort'),
    land: leseFeldwert('land')
  };
}

/*
  Liest einen Feldwert aus dem Formular.
*/
function leseFeldwert(feldId) {
  const feld = document.getElementById(feldId);
  return feld ? feld.value.trim() : '';
}

/*
  Prüft, ob alle Pflichtfelder der Lieferadresse gefüllt sind.
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

/*
  Liest die ausgewählte Zahlungsmethode.
*/
function leseZahlungsmethode() {
  const ausgewaehlt = document.querySelector('input[name="zahlungsmethode"]:checked');
  return ausgewaehlt ? ausgewaehlt.value : '';
}

/*
  Setzt Text in ein HTML-Element.
*/
function setzeText(elementId, text) {
  const element = document.getElementById(elementId);

  if (element) {
    element.textContent = text;
  }
}

/*
  Formatiert einen Preis im deutschen Euro-Format.
*/
function formatPreis(wert) {
  const nummer = Number(wert) || 0;

  return nummer.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });
}

/*
  Zeigt eine Meldung im Kassenbereich an.
*/
function zeigeMeldung(text, typ = 'success') {
  const meldung = document.getElementById('kasse-meldung');

  if (!meldung) {
    return;
  }

  meldung.innerHTML = `<div class="alert alert-${typ} mb-0">${escapeHtml(text)}</div>`;
}

/*
  Escaped HTML-Zeichen für sichere Ausgabe.
*/
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}