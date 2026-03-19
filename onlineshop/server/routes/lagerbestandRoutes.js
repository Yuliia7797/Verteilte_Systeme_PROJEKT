'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /lagerbestand
  Lädt alle Lagerbestände zusammen mit den Artikeldaten.
*/
router.get('/', (req, res) => {
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
*/
router.patch('/:artikel_id', (req, res) => {
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

      res.status(200).json({
        message: 'Lagerbestand aktualisiert',
        artikel_id,
        anzahl
      });
    }
  );
});

module.exports = router;