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

/**
 * Führt eine SQL-Abfrage aus.
 *
 * @function query
 * @param {string} sql - SQL-Abfrage
 * @param {Array<any>} [params=[]] - Parameter für die SQL-Abfrage
 * @returns {Promise<any>} Ergebnis der SQL-Abfrage
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

/**
 * GET /worker
 * Lädt alle Worker aus der Datenbank.
 * Dieser Endpunkt darf nur von Admins genutzt werden.
 */
router.get('/', istAdmin, async (req, res) => {
  try {
    const results = await query(
      `SELECT *
       FROM worker
       ORDER BY erstellungszeitpunkt DESC, id DESC`
    );

    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});

/**
 * GET /worker/aufgaben
 * Lädt alle Aufgaben mit Informationen zu Bestellung und Worker.
 * Dieser Endpunkt darf nur von Admins genutzt werden.
 */
router.get('/aufgaben', istAdmin, async (req, res) => {
  try {
    const results = await query(
      `SELECT au.id,
              au.bestellung_id,
              au.typ,
              au.status,
              au.worker_id,
              au.versuch_anzahl,
              au.fehlermeldung,
              au.erstellungszeitpunkt,
              au.startzeitpunkt,
              au.endzeitpunkt,
              b.bestellstatus
       FROM aufgabe au
       LEFT JOIN bestellung b ON au.bestellung_id = b.id
       ORDER BY au.erstellungszeitpunkt DESC, au.id DESC`
    );

    res.status(200).json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Datenbankfehler' });
  }
});

/**
 * PATCH /worker/:id/status
 * Ändert den Status eines Workers.
 * Erlaubte Werte sind "aktiv" und "inaktiv".
 * Dieser Endpunkt darf nur von Admins genutzt werden.
 */
router.patch('/:id/status', istAdmin, async (req, res) => {
  const workerId = Number.parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!Number.isInteger(workerId)) {
    return res.status(400).json({ message: 'Ungültige Worker-ID' });
  }

  if (!status || !['aktiv', 'inaktiv'].includes(status)) {
    return res.status(400).json({
      message: 'Ungültiger Status. Erlaubt sind nur "aktiv" oder "inaktiv".'
    });
  }

  try {
    const results = await query(
      'UPDATE worker SET status = ? WHERE id = ?',
      [status, workerId]
    );

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: 'Worker nicht gefunden' });
    }

    res.status(200).json({
      message: 'Worker-Status erfolgreich aktualisiert',
      worker_id: workerId,
      status: status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Fehler beim Aktualisieren des Worker-Status' });
  }
});

module.exports = router;