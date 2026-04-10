/**
 * Diese Datei definiert die API-Routen für die Lagerverwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET   /lagerbestand             – alle Lagerbestände mit Artikeldaten laden
 * - PATCH /lagerbestand/:artikel_id – Lagerbestand eines Artikels aktualisieren
 *                                      (legt einen neuen Datensatz an, falls noch keiner existiert)
 *                                      und sendet danach ein Socket.IO-Ereignis
 *                                      für die Echtzeit-Aktualisierung der Lageranzeige
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const istAdmin = require('../istAdmin');
const { getIo } = require('../socket');

/*
  GET /lagerbestand
  Lädt alle Lagerbestände zusammen mit den Artikeldaten.
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.get('/', istAdmin, (req, res) => {
  /*
    Alle Lagerbestände laden und zusätzlich
    die Artikelbezeichnung sowie die Artikel-ID anzeigen.
  */
  connection.query(
    `SELECT l.id, l.anzahl, l.aenderungszeitpunkt,
            a.bezeichnung AS artikel, a.id AS artikel_id
     FROM lagerbestand l
     JOIN artikel a ON l.artikel_id = a.id`,
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      res.status(200).json(results);
    }
  );
});

/*
  PATCH /lagerbestand/:artikel_id
  Aktualisiert den Lagerbestand eines Artikels.
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.patch('/:artikel_id', istAdmin, (req, res) => {
  // Artikel-ID aus der URL lesen
  const artikel_id = Number.parseInt(req.params.artikel_id, 10);
  const { anzahl } = req.body;

  // Prüfen, ob die Artikel-ID und Anzahl gültig sind
  if (!Number.isInteger(artikel_id) || anzahl === undefined) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID oder fehlende Anzahl' });
  }

  /*
    Falls der Artikel schon im Lagerbestand existiert,
    wird die Anzahl aktualisiert.
    Falls nicht, wird ein neuer Datensatz angelegt.
  */
  connection.query(
    `INSERT INTO lagerbestand (artikel_id, anzahl) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE anzahl = ?`,
    [artikel_id, anzahl, anzahl],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Aktualisieren des Lagerbestands' });
      }

      const io = getIo();

      io.emit('lager_aktualisiert', {
        artikelId: artikel_id
      });

      res.status(200).json({
        message: 'Lagerbestand aktualisiert',
        artikel_id,
        anzahl
      });
    }
  );
});

module.exports = router;