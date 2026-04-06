/*
  Datei: warenkorb-actions.js
  Beschreibung: Diese Datei bündelt die zentrale Frontend-Logik zum Hinzufügen
    von Artikeln in den Warenkorb.
    Sie prüft, ob ein Artikel gültig ist, ob noch Lagerbestand vorhanden ist,
    sendet die Anfrage an das Backend und behandelt Login-Fehler sowie
    Erfolgs- und Fehlermeldungen.
    Zusätzlich kann die Datei Klick-Handler für Buttons mit der Klasse
    "js-in-warenkorb" zentral registrieren.
  Hinweise: Verwendet die zentrale Auth-Logik aus auth.js
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 06.04.2026
*/

'use strict';

/**
 * Liest eine Artikel-ID aus einem Wert und gibt sie als Zahl zurück.
 * Bei ungültigen Werten wird null zurückgegeben.
 *
 * @function parseArtikelId
 * @param {string|number|null|undefined} wert - Artikel-ID aus DOM oder Backend
 * @returns {number|null} Gültige Artikel-ID oder null
 */
function parseArtikelId(wert) {
  const artikelId = Number(wert);

  if (!Number.isInteger(artikelId) || artikelId <= 0) {
    return null;
  }

  return artikelId;
}

/**
 * Prüft, ob ein Artikel noch lagernd ist.
 *
 * @function hatLagerbestand
 * @param {string|number|null|undefined} lagerbestand - Lagerbestand des Artikels
 * @returns {boolean} true, wenn Bestand vorhanden ist, sonst false
 */
function hatLagerbestand(lagerbestand) {
  const bestand = Number(lagerbestand);
  return Number.isFinite(bestand) && bestand > 0;
}

/**
 * Fügt einen Artikel über das Backend dem Warenkorb hinzu.
 * Behandelt Login-Weiterleitung, ungültige Daten, Lagerbestand und Button-Status.
 *
 * @async
 * @function fuegeArtikelZumWarenkorbHinzu
 * @param {string|number|null|undefined} artikelIdWert - Artikel-ID
 * @param {string|number|null|undefined} lagerbestandWert - Lagerbestand
 * @param {HTMLElement|null} [button=null] - Optionaler Button, der während der Anfrage deaktiviert wird
 * @returns {Promise<boolean>} true bei Erfolg, sonst false
 */
async function fuegeArtikelZumWarenkorbHinzu(artikelIdWert, lagerbestandWert, button = null) {
  const artikelId = parseArtikelId(artikelIdWert);

  if (!artikelId) {
    alert('Der Artikel konnte nicht erkannt werden.');
    return false;
  }

  if (!hatLagerbestand(lagerbestandWert)) {
    alert('Dieser Artikel ist aktuell nicht auf Lager.');
    return false;
  }

  if (button) {
    button.disabled = true;
  }

  try {
    const response = await fetch('/warenkorb/positionen', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({
        artikel_id: artikelId,
        anzahl: 1
      })
    });

    if (response.status === 401) {
      if (typeof window.weiterleiten === 'function') {
        window.weiterleiten('/static/login.html');
      } else {
        window.location.href = '/static/login.html';
      }

      return false;
    }

    let daten = {};

    try {
      daten = await response.json();
    } catch (error) {
      daten = {};
    }

    if (!response.ok) {
      throw new Error(daten.message || 'Der Artikel konnte nicht in den Warenkorb gelegt werden.');
    }

    alert(daten.message || 'Artikel wurde in den Warenkorb gelegt.');
    return true;
  } catch (error) {
    console.error('Fehler beim Hinzufügen zum Warenkorb:', error);
    alert(error.message || 'Serverfehler beim Hinzufügen zum Warenkorb.');
    return false;
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

/**
 * Registriert zentral einen Klick-Handler für alle Buttons mit der Klasse
 * "js-in-warenkorb" innerhalb des angegebenen Containers.
 * Falls kein Container übergeben wird, wird das gesamte Dokument verwendet.
 *
 * Erwartete data-Attribute am Button:
 * - data-artikel-id
 * - data-lagerbestand
 *
 * @function registriereAddToCartHandler
 * @param {ParentNode|Document} [container=document] - Container mit Buttons
 * @returns {void}
 */
function registriereAddToCartHandler(container = document) {
  container.addEventListener('click', async (event) => {
    const button = event.target.closest('.js-in-warenkorb');

    if (!button) {
      return;
    }

    event.preventDefault();

    const artikelId = button.dataset.artikelId;
    const lagerbestand = button.dataset.lagerbestand;

    await fuegeArtikelZumWarenkorbHinzu(artikelId, lagerbestand, button);
  });
}

window.parseArtikelId = parseArtikelId;
window.hatLagerbestand = hatLagerbestand;
window.fuegeArtikelZumWarenkorbHinzu = fuegeArtikelZumWarenkorbHinzu;
window.registriereAddToCartHandler = registriereAddToCartHandler;