'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /adresse/:benutzer_id
  Lädt alle Adressen eines bestimmten Benutzers.
*/
router.get('/:benutzer_id', (req, res) => {
  // Benutzer-ID aus der URL lesen
  const benutzer_id = Number.parseInt(req.params.benutzer_id, 10);

  // Prüfen, ob die Benutzer-ID gültig ist
  if (!Number.isInteger(benutzer_id)) {
    return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
  }

  // Alle Adressen des Benutzers laden
  connection.query(
    'SELECT * FROM adresse WHERE benutzer_id = ?',
    [benutzer_id],
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
  POST /adresse
  Speichert eine neue Adresse für einen Benutzer.
*/
router.post('/', (req, res) => {
  // Daten aus dem Request-Body lesen
  const { benutzer_id, strasse, hausnummer, postleitzahl, ort, land, adresszusatz } = req.body;

  // Prüfen, ob alle Pflichtfelder vorhanden sind
  if (!benutzer_id || !strasse || !hausnummer || !postleitzahl || !ort || !land) {
    return res.status(400).json({
      message: 'Pflichtfelder: benutzer_id, strasse, hausnummer, postleitzahl, ort, land'
    });
  }

  // Neue Adresse in der Datenbank speichern
  connection.query(
    `INSERT INTO adresse
    (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [benutzer_id, strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Speichern der Adresse' });
      }

      res.status(201).json({
        message: 'Adresse gespeichert',
        id: results.insertId
      });
    }
  );
});

/*
  PUT /adresse/:id
  Aktualisiert eine vorhandene Adresse.
*/
router.put('/:id', (req, res) => {
  // Adress-ID aus der URL lesen
  const id = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die ID gültig ist
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  const { strasse, hausnummer, adresszusatz, postleitzahl, ort, land } = req.body;

  // Prüfen, ob alle Pflichtfelder vorhanden sind
  if (!strasse || !hausnummer || !postleitzahl || !ort || !land) {
    return res.status(400).json({
      message: 'Pflichtfelder: strasse, hausnummer, postleitzahl, ort, land'
    });
  }

  // Adresse in der Datenbank aktualisieren
  connection.query(
    `UPDATE adresse
     SET strasse = ?, hausnummer = ?, adresszusatz = ?, postleitzahl = ?, ort = ?, land = ?
     WHERE id = ?`,
    [strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land, id],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Aktualisieren der Adresse' });
      }

      // Prüfen, ob die Adresse überhaupt existiert
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'Adresse nicht gefunden' });
      }

      res.status(200).json({ message: 'Adresse aktualisiert' });
    }
  );
});

/*
  DELETE /adresse/:id
  Löscht eine Adresse anhand ihrer ID.
*/
router.delete('/:id', (req, res) => {
  // Adress-ID aus der URL lesen
  const id = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die ID gültig ist
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  // Adresse aus der Datenbank löschen
  connection.query(
    'DELETE FROM adresse WHERE id = ?',
    [id],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Löschen' });
      }

      res.status(200).json({ message: 'Adresse gelöscht' });
    }
  );
});

module.exports = router;