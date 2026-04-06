/*
  Datei: warenkorb.js
  Beschreibung: Diese Datei steuert die Warenkorb-Seite im Frontend.
    Sie lädt die Positionen des aktuell eingeloggten Benutzers, zeigt sie an und ermöglicht:
    - Menge erhöhen
    - Menge verringern
    - Artikel entfernen
    - gesamten Warenkorb leeren
    Zusätzlich wird der Lagerbestand berücksichtigt:
    - Wenn die aktuelle Anzahl den Lagerbestand erreicht, wird der Plus-Button grau dargestellt.
    - Bei weiterem Klick erscheint eine Fehlermeldung.
  Hinweise: Verwendet die zentrale Formatierungslogik aus format.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Initialisiert die Warenkorb-Seite nach dem Laden des DOM.
 */
document.addEventListener('DOMContentLoaded', () => {
  initialisiereWarenkorb();
});

/**
 * Registriert alle Event-Handler der Warenkorb-Seite
 * und lädt anschließend die aktuellen Warenkorbdaten.
 *
 * @async
 * @function initialisiereWarenkorb
 * @returns {Promise<void>}
 */
async function initialisiereWarenkorb() {
  const leerenButton = document.getElementById('warenkorb-leeren-button');
  const zurKasseButton = document.getElementById('zur-kasse-button');
  const positionenContainer = document.getElementById('warenkorb-positionen');

  if (leerenButton) {
    leerenButton.addEventListener('click', async () => {
      const bestaetigt = window.confirm('Möchtest du wirklich alle Artikel aus dem Warenkorb entfernen?');

      if (!bestaetigt) {
        return;
      }

      try {
        const response = await fetch('/warenkorb/leeren', {
          method: 'DELETE',
          credentials: 'same-origin'
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Fehler beim Leeren des Warenkorbs');
        }

        zeigeMeldung(data.message || 'Warenkorb wurde geleert.', 'success');
        await ladeWarenkorb();
      } catch (error) {
        console.error('Fehler beim Leeren des Warenkorbs:', error);
        zeigeMeldung(error.message || 'Serverfehler beim Leeren des Warenkorbs.', 'danger');
      }
    });
  }

  if (zurKasseButton) {
    zurKasseButton.addEventListener('click', () => {
      window.location.href = '/static/kasse.html';
    });
  }

  if (positionenContainer) {
    positionenContainer.addEventListener('click', async (event) => {
      const plusButton = event.target.closest('.js-menge-erhoehen');
      const minusButton = event.target.closest('.js-menge-verringern');
      const entfernenButton = event.target.closest('.js-artikel-entfernen');

      if (plusButton) {
        const artikelId = Number.parseInt(plusButton.dataset.artikelId, 10);
        const aktuelleAnzahl = Number.parseInt(plusButton.dataset.anzahl, 10);
        const lagerbestand = Number.parseInt(plusButton.dataset.lagerbestand, 10);

        if (Number.isInteger(artikelId) && Number.isInteger(aktuelleAnzahl)) {
          if (Number.isInteger(lagerbestand) && aktuelleAnzahl >= lagerbestand) {
            zeigeMeldung('Die angegebene Menge überschreitet den Lagerbestand.', 'danger');
            return;
          }

          await aktualisiereArtikelmenge(artikelId, aktuelleAnzahl + 1);
        }

        return;
      }

      if (minusButton) {
        const artikelId = Number.parseInt(minusButton.dataset.artikelId, 10);
        const aktuelleAnzahl = Number.parseInt(minusButton.dataset.anzahl, 10);

        if (Number.isInteger(artikelId) && Number.isInteger(aktuelleAnzahl)) {
          if (aktuelleAnzahl <= 1) {
            const bestaetigt = window.confirm('Soll dieser Artikel aus dem Warenkorb entfernt werden?');

            if (!bestaetigt) {
              return;
            }

            await entferneArtikel(artikelId);
          } else {
            await aktualisiereArtikelmenge(artikelId, aktuelleAnzahl - 1);
          }
        }

        return;
      }

      if (entfernenButton) {
        const artikelId = Number.parseInt(entfernenButton.dataset.artikelId, 10);

        if (!Number.isInteger(artikelId)) {
          return;
        }

        const bestaetigt = window.confirm('Möchtest du diesen Artikel aus dem Warenkorb entfernen?');

        if (!bestaetigt) {
          return;
        }

        await entferneArtikel(artikelId);
      }
    });
  }

  await ladeWarenkorb();
}

/**
 * Lädt den aktuellen Warenkorb des Benutzers vom Server
 * und rendert die Ansicht abhängig vom Ergebnis.
 *
 * @async
 * @function ladeWarenkorb
 * @returns {Promise<void>}
 */
async function ladeWarenkorb() {
  const ladeanzeige = document.getElementById('warenkorb-ladeanzeige');
  const leerContainer = document.getElementById('warenkorb-leer');
  const positionenContainer = document.getElementById('warenkorb-positionen');
  const leerenButton = document.getElementById('warenkorb-leeren-button');
  const zurKasseButton = document.getElementById('zur-kasse-button');

  if (ladeanzeige) {
    ladeanzeige.style.display = '';
  }

  if (leerContainer) {
    leerContainer.style.display = 'none';
  }

  if (positionenContainer) {
    positionenContainer.style.display = 'none';
    positionenContainer.innerHTML = '';
  }

  if (leerenButton) {
    leerenButton.style.display = 'none';
  }

  if (zurKasseButton) {
    zurKasseButton.disabled = true;
  }

  try {
    const response = await fetch('/warenkorb', {
      method: 'GET',
      credentials: 'same-origin'
    });

    const data = await response.json();

    if (response.status === 401) {
      renderNichtEingeloggt();
      return;
    }

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Laden des Warenkorbs');
    }

    renderWarenkorb(data);
  } catch (error) {
    console.error('Fehler beim Laden des Warenkorbs:', error);

    if (ladeanzeige) {
      ladeanzeige.style.display = 'none';
      ladeanzeige.innerHTML = '<p class="text-danger mb-0">Der Warenkorb konnte nicht geladen werden.</p>';
    }

    zeigeMeldung(error.message || 'Serverfehler beim Laden des Warenkorbs.', 'danger');
  }
}

/**
 * Rendert die Ansicht für nicht eingeloggte Benutzer
 * und setzt die Zusammenfassung auf 0 zurück.
 *
 * @function renderNichtEingeloggt
 */
function renderNichtEingeloggt() {
  const ladeanzeige = document.getElementById('warenkorb-ladeanzeige');
  const leerContainer = document.getElementById('warenkorb-leer');
  const positionenContainer = document.getElementById('warenkorb-positionen');

  if (ladeanzeige) {
    ladeanzeige.style.display = 'none';
  }

  if (leerContainer) {
    leerContainer.style.display = 'none';
  }

  if (positionenContainer) {
    positionenContainer.style.display = '';
    positionenContainer.innerHTML = `
      <div class="text-center py-4">
        <i class="bi bi-person-lock fs-1 d-block mb-3"></i>
        <p class="mb-3">Bitte melde dich an, um deinen Warenkorb zu sehen.</p>
        <a href="/static/login.html" class="btn btn-dark">Zum Login</a>
      </div>
    `;
  }

  aktualisiereZusammenfassung({
    artikelanzahl: 0,
    zwischensumme: 0,
    versand: 0,
    gesamtsumme: 0
  });
}

/**
 * Rendert den Warenkorb mit allen Positionen
 * und aktualisiert die Zusammenfassung.
 *
 * @function renderWarenkorb
 * @param {Object} data - Warenkorbdaten vom Backend
 */
function renderWarenkorb(data) {
  const ladeanzeige = document.getElementById('warenkorb-ladeanzeige');
  const leerContainer = document.getElementById('warenkorb-leer');
  const positionenContainer = document.getElementById('warenkorb-positionen');
  const leerenButton = document.getElementById('warenkorb-leeren-button');
  const zurKasseButton = document.getElementById('zur-kasse-button');

  if (ladeanzeige) {
    ladeanzeige.style.display = 'none';
  }

  const positionen = Array.isArray(data.positionen) ? data.positionen : [];

  if (positionen.length === 0) {
    if (leerContainer) {
      leerContainer.style.display = '';
    }

    if (positionenContainer) {
      positionenContainer.style.display = 'none';
      positionenContainer.innerHTML = '';
    }

    if (leerenButton) {
      leerenButton.style.display = 'none';
    }

    if (zurKasseButton) {
      zurKasseButton.disabled = true;
    }
  } else {
    if (leerContainer) {
      leerContainer.style.display = 'none';
    }

    if (positionenContainer) {
      positionenContainer.style.display = '';
      positionenContainer.innerHTML = positionen.map((position) => {
        const aktuelleAnzahl = Number(position.anzahl) || 0;
        const lagerbestand = Number(position.lagerbestand) || 0;
        const maxBestandErreicht = aktuelleAnzahl >= lagerbestand && lagerbestand > 0;

        return `
          <div class="border rounded p-3 mb-3">
            <div class="row align-items-center g-3">
              <div class="col-md-2 col-4">
                <img
                  src="/static/${position.bild_url}"
                  alt="${escapeHtml(position.bezeichnung)}"
                  class="img-fluid rounded border"
                >
              </div>

              <div class="col-md-4 col-8">
                <h3 class="h6 mb-1">${escapeHtml(position.bezeichnung)}</h3>
                <p class="text-muted mb-1 small">${escapeHtml(position.beschreibung || '')}</p>
                <p class="mb-1"><strong>Einzelpreis:</strong> ${formatPreis(position.einzelpreis)}</p>
                <p class="mb-0 small text-muted">Verfügbar: ${lagerbestand} Stück</p>
              </div>

              <div class="col-md-3 col-sm-6">
                <div class="d-flex align-items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm js-menge-verringern"
                    data-artikel-id="${position.artikel_id}"
                    data-anzahl="${position.anzahl}"
                    title="Menge verringern"
                  >
                    <i class="bi bi-dash"></i>
                  </button>

                  <span class="fw-bold">${position.anzahl}</span>

                  <button
                    type="button"
                    class="btn btn-outline-secondary btn-sm js-menge-erhoehen ${maxBestandErreicht ? 'opacity-50' : ''}"
                    data-artikel-id="${position.artikel_id}"
                    data-anzahl="${position.anzahl}"
                    data-lagerbestand="${lagerbestand}"
                    title="${maxBestandErreicht ? 'Maximaler Lagerbestand erreicht' : 'Menge erhöhen'}"
                  >
                    <i class="bi bi-plus"></i>
                  </button>
                </div>
              </div>

              <div class="col-md-2 col-sm-4">
                <strong>${formatPreis(position.gesamtpreis)}</strong>
              </div>

              <div class="col-md-1 col-sm-2 text-sm-end">
                <button
                  type="button"
                  class="btn btn-outline-danger btn-sm js-artikel-entfernen"
                  data-artikel-id="${position.artikel_id}"
                  title="Artikel entfernen"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    if (leerenButton) {
      leerenButton.style.display = '';
    }

    if (zurKasseButton) {
      zurKasseButton.disabled = false;
    }
  }

  aktualisiereZusammenfassung(data.zusammenfassung || {
    artikelanzahl: 0,
    zwischensumme: 0,
    versand: 0,
    gesamtsumme: 0
  });
}

/**
 * Aktualisiert die Menge eines Artikels im Warenkorb
 * und lädt den Warenkorb danach neu.
 *
 * @async
 * @function aktualisiereArtikelmenge
 * @param {number} artikelId - ID des Artikels
 * @param {number} neueAnzahl - Neue Anzahl im Warenkorb
 * @returns {Promise<void>}
 */
async function aktualisiereArtikelmenge(artikelId, neueAnzahl) {
  try {
    const response = await fetch(`/warenkorb/positionen/${artikelId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ anzahl: neueAnzahl })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Aktualisieren der Menge');
    }

    zeigeMeldung(data.message || 'Menge aktualisiert.', 'success');
    await ladeWarenkorb();
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Menge:', error);
    zeigeMeldung(error.message || 'Serverfehler beim Aktualisieren der Menge.', 'danger');
  }
}

/**
 * Entfernt einen Artikel aus dem Warenkorb
 * und lädt den Warenkorb danach neu.
 *
 * @async
 * @function entferneArtikel
 * @param {number} artikelId - ID des zu entfernenden Artikels
 * @returns {Promise<void>}
 */
async function entferneArtikel(artikelId) {
  try {
    const response = await fetch(`/warenkorb/positionen/${artikelId}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Fehler beim Entfernen des Artikels');
    }

    zeigeMeldung(data.message || 'Artikel wurde entfernt.', 'success');
    await ladeWarenkorb();
  } catch (error) {
    console.error('Fehler beim Entfernen des Artikels:', error);
    zeigeMeldung(error.message || 'Serverfehler beim Entfernen des Artikels.', 'danger');
  }
}

/**
 * Aktualisiert die Preis- und Mengenzusammenfassung
 * im Warenkorbbereich.
 *
 * @function aktualisiereZusammenfassung
 * @param {Object} zusammenfassung - Zusammenfassungsdaten des Warenkorbs
 */
function aktualisiereZusammenfassung(zusammenfassung) {
  const artikelanzahl = document.getElementById('summary-artikelanzahl');
  const zwischensumme = document.getElementById('summary-zwischensumme');
  const versand = document.getElementById('summary-versand');
  const gesamtsumme = document.getElementById('summary-gesamtsumme');

  if (artikelanzahl) {
    artikelanzahl.textContent = zusammenfassung.artikelanzahl ?? 0;
  }

  if (zwischensumme) {
    zwischensumme.textContent = formatPreis(zusammenfassung.zwischensumme ?? 0);
  }

  if (versand) {
    versand.textContent = formatPreis(zusammenfassung.versand ?? 0);
  }

  if (gesamtsumme) {
    gesamtsumme.textContent = formatPreis(zusammenfassung.gesamtsumme ?? 0);
  }
}


/**
 * Zeigt eine Statusmeldung im Warenkorbbereich an
 * und blendet sie nach kurzer Zeit wieder aus.
 *
 * @function zeigeMeldung
 * @param {string} text - Meldungstext
 * @param {string} [typ='success'] - Bootstrap-Typ der Meldung
 */
function zeigeMeldung(text, typ = 'success') {
  const meldung = document.getElementById('warenkorb-meldung');

  if (!meldung) {
    return;
  }

  meldung.innerHTML = `<div class="alert alert-${typ} mb-0">${escapeHtml(text)}</div>`;

  window.setTimeout(() => {
    meldung.innerHTML = '';
  }, 3000);
}

/**
 * Escaped HTML-Sonderzeichen für eine sichere Ausgabe im DOM.
 *
 * @function escapeHtml
 * @param {string} text - Zu escapender Text
 * @returns {string} Sicherer HTML-Text
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}