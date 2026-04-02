/**
 * Diese Datei definiert die API-Routen für Kategorien.
 * Sie stellt folgende Endpunkte bereit:
 * - GET    /kategorien       – alle Kategorien laden
 * - POST   /kategorien       – neue Kategorie anlegen
 * - DELETE /kategorien/:id   – Kategorie löschen
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /kategorien
  Lädt alle Kategorien aus der Datenbank.
*/
router.get('/', (req, res) => {
  connection.query(
    'SELECT * FROM kategorie ORDER BY bezeichnung ASC',
    (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankabfrage fehlgeschlagen' });
      }

      res.status(200).json(results);
    }
  );
});

/*
  POST /kategorien
  Legt eine neue Kategorie an.
*/
router.post('/', (req, res) => {
  const { bezeichnung } = req.body;

  // Prüfen, ob eine Bezeichnung vorhanden ist
  if (!bezeichnung || !bezeichnung.trim()) {
    return res.status(400).json({ message: 'Bitte eine Bezeichnung angeben' });
  }

  const bereinigteBezeichnung = bezeichnung.trim();

  // Prüfen, ob die Kategorie schon existiert
  connection.query(
    'SELECT id FROM kategorie WHERE bezeichnung = ?',
    [bereinigteBezeichnung],
    (fehlerPruefung, vorhandeneKategorie) => {
      if (fehlerPruefung) {
        console.error(fehlerPruefung);
        return res.status(500).json({ message: 'Fehler bei der Prüfung der Kategorie' });
      }

      if (vorhandeneKategorie.length > 0) {
        return res.status(400).json({ message: 'Diese Kategorie existiert bereits' });
      }

      // Neue Kategorie speichern
      connection.query(
        'INSERT INTO kategorie (bezeichnung) VALUES (?)',
        [bereinigteBezeichnung],
        (fehlerInsert, result) => {
          if (fehlerInsert) {
            console.error(fehlerInsert);
            return res.status(500).json({ message: 'Kategorie konnte nicht erstellt werden' });
          }

          res.status(201).json({
            message: 'Kategorie erfolgreich erstellt',
            id: result.insertId
          });
        }
      );
    }
  );
});

/*
  DELETE /kategorien/:id
  Löscht eine Kategorie.
*/
router.delete('/:id', (req, res) => {
  const kategorieId = Number.parseInt(req.params.id, 10);

  if (!Number.isInteger(kategorieId)) {
    return res.status(400).json({ message: 'Ungültige Kategorie-ID' });
  }

  // Prüfen, ob noch Artikel mit dieser Kategorie verknüpft sind
  connection.query(
    'SELECT id FROM artikel WHERE kategorie_id = ? LIMIT 1',
    [kategorieId],
    (fehlerArtikel, artikelResults) => {
      if (fehlerArtikel) {
        console.error(fehlerArtikel);
        return res.status(500).json({ message: 'Fehler bei der Prüfung verknüpfter Artikel' });
      }

      if (artikelResults.length > 0) {
        return res.status(400).json({
          message: 'Kategorie kann nicht gelöscht werden, weil noch Artikel zugeordnet sind'
        });
      }

      // Kategorie löschen
      connection.query(
        'DELETE FROM kategorie WHERE id = ?',
        [kategorieId],
        (fehlerDelete, result) => {
          if (fehlerDelete) {
            console.error(fehlerDelete);
            return res.status(500).json({ message: 'Kategorie konnte nicht gelöscht werden' });
          }

          if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Kategorie nicht gefunden' });
          }

          res.status(200).json({ message: 'Kategorie erfolgreich gelöscht' });
        }
      );
    }
  );
});

module.exports = router;