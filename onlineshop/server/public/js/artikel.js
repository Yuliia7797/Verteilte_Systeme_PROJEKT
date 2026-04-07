/*
  Datei: artikel.js
  Beschreibung: Diese Datei steuert die Artikelübersicht auf der Startseite des Onlineshops.
    Beim Laden der Seite werden alle verfügbaren Artikel per GET-Request vom Backend geladen
    und dynamisch in den Artikelcontainer der Seite eingefügt.
    Das Rendern der einzelnen Karten erfolgt über zentrale Komponenten.
    Falls keine Artikel vorhanden sind oder ein Fehler auftritt, wird eine entsprechende Meldung ausgegeben.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

'use strict';

/**
 * Lädt alle Artikel vom Server und zeigt sie auf der Startseite an.
 *
 * @async
 * @function ladeArtikel
 * @returns {Promise<void>} Kein Rückgabewert
 */
async function ladeArtikel() {
  try {
    const artikel = await window.apiGet('/artikel');

    if (typeof window.renderArtikelListe === 'function') {
      window.renderArtikelListe('artikel-container', artikel, {
        leerText: 'Keine Artikel gefunden.',
        zeigeBeschreibung: true,
        spaltenKlasse: 'col-md-4'
      });
    } else {
      console.error('artikel-list.js wurde nicht korrekt geladen.');
    }
  } catch (error) {
    console.error('Fehler beim Laden der Artikel:', error);
  }
}

/**
 * Initialisiert die Artikelübersicht auf der Startseite
 * und registriert die zentrale Warenkorb-Logik.
 *
 * @async
 * @function initArtikelSeite
 * @returns {Promise<void>} Kein Rückgabewert
 */
async function initArtikelSeite() {
  await ladeArtikel();

  if (typeof window.registriereAddToCartHandler === 'function') {
    window.registriereAddToCartHandler(document);
  } else {
    console.error('warenkorb-actions.js wurde nicht korrekt geladen.');
  }
}

document.addEventListener('DOMContentLoaded', initArtikelSeite);