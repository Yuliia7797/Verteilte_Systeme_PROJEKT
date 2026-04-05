/**
 * Diese Datei definiert die API-Routen für die Worker-Verwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET   /worker            – alle Worker aus der Datenbank laden
 * - GET   /worker/aufgaben   – alle Aufgaben laden, mit zugehörigem Bestellstatus und Worker-ID
 * - PATCH /worker/:id/status – Status eines Workers ändern
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');
const istAdmin = require('../istAdmin');

/*
  GET /worker
  Lädt alle Worker aus der Datenbank.
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.get('/', istAdmin, (req, res) => {
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
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.get('/aufgaben', istAdmin, (req, res) => {
  /*
    Alle Aufgaben laden und zusätzlich
    Bestellstatus und Worker-ID anzeigen.
  */
  connection.query(
    `SELECT au.id, au.typ, au.status, au.versuch_anzahl, au.fehlermeldung,
            au.erstellungszeitpunkt, au.startzeitpunkt, au.endzeitpunkt,
            b.bestellstatus, w.id AS worker_id
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

/*
  PATCH /worker/:id/status
  Ändert den Status eines Workers.
  Erlaubte Werte sind "aktiv" und "inaktiv".
  Dieser Endpunkt darf nur von Admins genutzt werden.
*/
router.patch('/:id/status', istAdmin, (req, res) => {
  // Worker-ID aus der URL lesen und in eine Zahl umwandeln
  const workerId = Number.parseInt(req.params.id, 10);

  // Neuen Status aus dem Request-Body lesen
  const { status } = req.body;

  // Prüfen, ob die Worker-ID gültig ist
  if (!Number.isInteger(workerId)) {
    return res.status(400).json({ message: 'Ungültige Worker-ID' });
  }

  // Prüfen, ob ein erlaubter Status übergeben wurde
  if (!status || !['aktiv', 'inaktiv'].includes(status)) {
    return res.status(400).json({
      message: 'Ungültiger Status. Erlaubt sind nur "aktiv" oder "inaktiv".'
    });
  }

  // Status des Workers in der Datenbank aktualisieren
  connection.query(
    'UPDATE worker SET status = ? WHERE id = ?',
    [status, workerId],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Aktualisieren des Worker-Status' });
      }

      // Prüfen, ob ein Worker mit dieser ID existiert
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Worker nicht gefunden' });
      }

      res.status(200).json({
        message: 'Worker-Status erfolgreich aktualisiert',
        worker_id: workerId,
        status: status
      });
    }
  );
});

module.exports = router;