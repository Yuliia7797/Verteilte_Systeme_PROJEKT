'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /artikel
  Lädt alle Artikel.
  Optional kann nach Kategorie gefiltert werden:
  Beispiel: /artikel?kategorie_id=2
*/
router.get('/', (req, res) => {
  // Kategorie-ID aus der URL lesen, falls vorhanden
  const kategorieId = req.query.kategorie_id;

  // Standardmäßig werden alle Artikel geladen
  let query = 'SELECT * FROM artikel';
  let queryParams = [];

  // Falls eine Kategorie-ID übergeben wurde,
  // werden nur Artikel dieser Kategorie geladen
  if (kategorieId) {
    query = 'SELECT * FROM artikel WHERE kategorie_id = ?';
    queryParams = [kategorieId];
  }

  connection.query(query, queryParams, (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Datenbankabfrage fehlgeschlagen' });
    }

    res.status(200).json(results);
  });
});

/*
  GET /artikel/:id
  Lädt einen einzelnen Artikel mit Kategorie und Lagerbestand.
*/
router.get('/:id', (req, res) => {
  const artikelId = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die Artikel-ID gültig ist
  if (!Number.isInteger(artikelId)) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID' });
  }

  const query = `
    SELECT
      artikel.id,
      artikel.bezeichnung,
      artikel.beschreibung,
      artikel.langbeschreibung,
      artikel.preis,
      artikel.bild_url,
      kategorie.bezeichnung AS kategorie_name,
      lagerbestand.anzahl AS lagerbestand
    FROM artikel
    LEFT JOIN kategorie ON artikel.kategorie_id = kategorie.id
    LEFT JOIN lagerbestand ON artikel.id = lagerbestand.artikel_id
    WHERE artikel.id = ?
  `;

  connection.query(query, [artikelId], (error, results) => {
    if (error) {
      console.error(error);
      return res.status(500).json({ message: 'Datenbankabfrage fehlgeschlagen' });
    }

    // Falls kein Artikel gefunden wurde
    if (results.length === 0) {
      return res.status(404).json({ message: 'Artikel nicht gefunden' });
    }

    res.status(200).json(results[0]);
  });
});

/*
  POST /artikel
  Legt einen neuen Artikel an.
*/
router.post('/', (req, res) => {
  // Daten für den neuen Artikel aus dem Request-Body lesen
  const { kategorie_id, bezeichnung, beschreibung, preis, bild_url } = req.body;

  // Prüfen, ob die Pflichtfelder vorhanden sind
  if (!kategorie_id || !bezeichnung || !preis) {
    return res.status(400).json({
      message: 'kategorie_id, bezeichnung und preis sind Pflichtfelder'
    });
  }

  connection.query(
    'INSERT INTO artikel (kategorie_id, bezeichnung, beschreibung, preis, bild_url) VALUES (?, ?, ?, ?, ?)',
    [kategorie_id, bezeichnung, beschreibung || null, preis, bild_url || null],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Anlegen des Artikels' });
      }

      res.status(201).json({ message: 'Artikel angelegt', id: results.insertId });
    }
  );
});

/*
  DELETE /artikel/:id
  Löscht einen Artikel anhand seiner ID.
*/
router.delete('/:id', (req, res) => {
  // Artikel-ID aus der URL lesen
  const artikelId = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die ID gültig ist
  if (!Number.isInteger(artikelId)) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID' });
  }

  connection.query(
    'DELETE FROM artikel WHERE id = ?',
    [artikelId],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Löschen' });
      }

      res.status(200).json({ message: 'Artikel gelöscht' });
    }
  );
});

module.exports = router;