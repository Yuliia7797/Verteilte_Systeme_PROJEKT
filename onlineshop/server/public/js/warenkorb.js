/**
 * Diese Datei steuert die Warenkorb-Seite im Frontend.
 * Sie lädt die Positionen des aktuell eingeloggten Benutzers, zeigt sie an
 * und ermöglicht:
 * - Menge erhöhen
 * - Menge verringern
 * - Artikel entfernen
 * - gesamten Warenkorb leeren
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  initialisiereWarenkorb();
});

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
    leerenButton?.addEventListener;
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

        if (Number.isInteger(artikelId) && Number.isInteger(aktuelleAnzahl)) {
          await aktualisiereArtikelmenge(artikelId, aktuelleAnzahl + 1);
          return;
        }
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
      positionenContainer.innerHTML = positionen.map((position) => `
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
              <p class="mb-0"><strong>Einzelpreis:</strong> ${formatPreis(position.einzelpreis)}</p>
            </div>

            <div class="col-md-3 col-sm-6">
              <div class="d-flex align-items-center gap-2">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm js-menge-verringern"
                  data-artikel-id="${position.artikel_id}"
                  data-anzahl="${position.anzahl}"
                >
                  <i class="bi bi-dash"></i>
                </button>

                <span class="fw-bold">${position.anzahl}</span>

                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm js-menge-erhoehen"
                  data-artikel-id="${position.artikel_id}"
                  data-anzahl="${position.anzahl}"
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
      `).join('');
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

function formatPreis(wert) {
  const nummer = Number(wert) || 0;

  return nummer.toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR'
  });
}

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

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}