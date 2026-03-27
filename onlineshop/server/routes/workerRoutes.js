/**
 * Diese Datei definiert die API-Routen für die Worker-Verwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET /worker          – alle Worker aus der Datenbank laden
 * - GET /worker/aufgaben – alle Aufgaben laden, mit zugehörigem Bestellstatus und Worker-Typ
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /worker
  Lädt alle Worker aus der Datenbank.
*/
router.get('/', (req, res) => {
  // Alle Worker nach Erstellungszeitpunkt absteigend laden
  connection.query(
    'SELECT * FROM worker ORDER BY erstellungszeitpunkt DESC',
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
  GET /worker/aufgaben
  Lädt alle Aufgaben mit Informationen zu Bestellung und Worker.
*/
router.get('/aufgaben', (req, res) => {
  /*
    Alle Aufgaben laden und zusätzlich
    Bestellstatus und Worker-Typ anzeigen.
  */
  connection.query(
    `SELECT au.id, au.typ, au.status, au.versuch_anzahl, au.fehlermeldung,
            au.erstellungszeitpunkt, au.startzeitpunkt, au.endzeitpunkt,
            b.bestellstatus, w.typ AS worker_typ
     FROM aufgabe au
     LEFT JOIN bestellung b ON au.bestellung_id = b.id
     LEFT JOIN worker w ON au.worker_id = w.id
     ORDER BY au.erstellungszeitpunkt DESC`,
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      res.status(200).json(results);
    }
  );
});

module.exports = router;