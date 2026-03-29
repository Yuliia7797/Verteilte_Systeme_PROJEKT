'use strict';

document.addEventListener('DOMContentLoaded', () => {
  ladeWarenkorb();
});

async function ladeWarenkorb() {
  const container = document.getElementById('warenkorb-container');
  const zwischensummeElement = document.getElementById('zwischensumme');
  const versandElement = document.getElementById('versand');
  const gesamtElement = document.getElementById('gesamt');

  // Anpassen, je nachdem wie ihr die Benutzer-ID speichert
  const benutzerId = sessionStorage.getItem('benutzer_id');

  if (!benutzerId) {
    container.innerHTML = `
      <div class="alert alert-warning text-center">
        Du bist nicht eingeloggt.
      </div>
    `;
    document.getElementById('warenkorb-summe').style.display = 'none';
    return;
  }

  try {
    const response = await fetch(`/warenkorb/${benutzerId}`);
    const daten = await response.json();

    if (!response.ok) {
      throw new Error(daten.message || 'Fehler beim Laden des Warenkorbs');
    }

    if (!daten || daten.length === 0) {
      container.innerHTML = `
        <div class="card p-4 text-center">
          <p class="mb-0">Dein Warenkorb ist leer.</p>
        </div>
      `;
      zwischensummeElement.textContent = '0,00 €';
      versandElement.textContent = '0,00 €';
      gesamtElement.textContent = '0,00 €';
      return;
    }

    container.innerHTML = '';

    let zwischensumme = 0;

    daten.forEach((position) => {
      const positionspreis = Number(position.gesamtpreis);
      zwischensumme += positionspreis;

      const artikelKarte = document.createElement('div');
      artikelKarte.className = 'card p-4 mb-4';

      artikelKarte.innerHTML = `
        <div class="row align-items-center">
          <div class="col-md-2">
            <img
              src="${position.bild_url || 'https://via.placeholder.com/150'}"
              class="img-fluid rounded"
              alt="${escapeHtml(position.artikel)}"
            >
          </div>

          <div class="col-md-4">
            <h5>${escapeHtml(position.artikel)}</h5>
            <p>Menge im Warenkorb: ${position.anzahl}</p>
          </div>

          <div class="col-md-2">
            <label class="form-label">Menge</label>
            <input
              type="number"
              class="form-control"
              value="${position.anzahl}"
              min="1"
              disabled
            >
          </div>

          <div class="col-md-2">
            <div>Einzelpreis</div>
            <strong>${formatEuro(position.einzelpreis)}</strong>
          </div>

          <div class="col-md-2 text-end">
            <div class="mb-2">
              <strong>${formatEuro(position.gesamtpreis)}</strong>
            </div>
            <button
              class="btn btn-light-custom btn-entfernen"
              data-position-id="${position.id}"
            >
              Entfernen
            </button>
          </div>
        </div>
      `;

      container.appendChild(artikelKarte);
    });

    const versand = zwischensumme > 0 ? 4.99 : 0;
    const gesamt = zwischensumme + versand;

    zwischensummeElement.textContent = formatEuro(zwischensumme);
    versandElement.textContent = formatEuro(versand);
    gesamtElement.textContent = formatEuro(gesamt);

    registriereEntfernenButtons();

  } catch (error) {
    console.error('Fehler beim Laden des Warenkorbs:', error);

    container.innerHTML = `
      <div class="alert alert-danger text-center">
        Der Warenkorb konnte nicht geladen werden.
      </div>
    `;

    document.getElementById('warenkorb-summe').style.display = 'none';
  }
}

function registriereEntfernenButtons() {
  const buttons = document.querySelectorAll('.btn-entfernen');

  buttons.forEach((button) => {
    button.addEventListener('click', async () => {
      const positionId = button.dataset.positionId;

      try {
        const response = await fetch(`/warenkorb/position/${positionId}`, {
          method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Fehler beim Entfernen');
        }

        await ladeWarenkorb();
      } catch (error) {
        console.error('Fehler beim Entfernen:', error);
        alert('Die Position konnte nicht entfernt werden.');
      }
    });
  });
}

function formatEuro(wert) {
  return `${Number(wert).toFixed(2).replace('.', ',')} €`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}