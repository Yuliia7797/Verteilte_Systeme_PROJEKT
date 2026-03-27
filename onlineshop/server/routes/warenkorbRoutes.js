/**
 * Diese Datei definiert die API-Routen für die Warenkorb-Verwaltung.
 * Sie stellt folgende Endpunkte bereit:
 * - GET    /warenkorb/:benutzer_id   – alle Positionen im Warenkorb eines Benutzers laden
 * - POST   /warenkorb                – Artikel in den Warenkorb legen
 *                                      (erstellt automatisch einen Warenkorb, falls noch keiner existiert)
 * - DELETE /warenkorb/position/:id   – einzelne Position aus dem Warenkorb entfernen
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/*
  GET /warenkorb/:benutzer_id
  Lädt alle Warenkorb-Positionen eines bestimmten Benutzers.
*/
router.get('/:benutzer_id', (req, res) => {
  // Benutzer-ID aus der URL lesen
  const benutzer_id = Number.parseInt(req.params.benutzer_id, 10);

  // Prüfen, ob die Benutzer-ID gültig ist
  if (!Number.isInteger(benutzer_id)) {
    return res.status(400).json({ message: 'Ungültige Benutzer-ID' });
  }

  /*
    Alle Positionen aus dem Warenkorb laden,
    inklusive Artikelbezeichnung und Bild.
  */
  connection.query(
    `SELECT wp.id, wp.anzahl, wp.einzelpreis, wp.gesamtpreis,
            a.bezeichnung AS artikel, a.bild_url
     FROM warenkorb w
     JOIN warenkorb_position wp ON w.id = wp.warenkorb_id
     JOIN artikel a ON wp.artikel_id = a.id
     WHERE w.benutzer_id = ?`,
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
  POST /warenkorb
  Fügt einen Artikel in den Warenkorb ein.
  Falls noch kein Warenkorb existiert, wird zuerst einer erstellt.
*/
router.post('/', (req, res) => {
  // Daten aus dem Request-Body lesen
  const { benutzer_id, artikel_id, anzahl } = req.body;

  // Prüfen, ob alle Pflichtfelder vorhanden sind
  if (!benutzer_id || !artikel_id || !anzahl) {
    return res.status(400).json({
      message: 'benutzer_id, artikel_id und anzahl sind Pflichtfelder'
    });
  }

  // Preis des ausgewählten Artikels laden
  connection.query(
    'SELECT preis FROM artikel WHERE id = ?',
    [artikel_id],
    (error, artikelResult) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Datenbankfehler' });
      }

      // Prüfen, ob der Artikel existiert
      if (artikelResult.length === 0) {
        return res.status(404).json({ message: 'Artikel nicht gefunden' });
      }

      // Einzelpreis und Gesamtpreis berechnen
      const einzelpreis = artikelResult[0].preis;
      const gesamtpreis = einzelpreis * anzahl;

      // Prüfen, ob der Benutzer bereits einen Warenkorb hat
      connection.query(
        'SELECT id FROM warenkorb WHERE benutzer_id = ?',
        [benutzer_id],
        (error, korbResult) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: 'Datenbankfehler' });
          }

          /*
            Hilfsfunktion:
            Fügt die neue Position in den gefundenen oder neu erstellten
            Warenkorb ein.
          */
          const insertPosition = (warenkorb_id) => {
            connection.query(
              `INSERT INTO warenkorb_position
              (warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis)
              VALUES (?, ?, ?, ?, ?)`,
              [warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis],
              (error, results) => {
                if (error) {
                  console.error(error);
                  return res.status(500).json({ message: 'Fehler beim Hinzufügen' });
                }

                res.status(201).json({
                  message: 'Artikel in Warenkorb gelegt',
                  id: results.insertId
                });
              }
            );
          };

          // Wenn schon ein Warenkorb existiert, direkt Position einfügen
          if (korbResult.length > 0) {
            insertPosition(korbResult[0].id);
          } else {
            // Falls kein Warenkorb existiert, zuerst einen neuen anlegen
            connection.query(
              'INSERT INTO warenkorb (benutzer_id) VALUES (?)',
              [benutzer_id],
              (error, newKorb) => {
                if (error) {
                  console.error(error);
                  return res.status(500).json({ message: 'Fehler beim Erstellen des Warenkorbs' });
                }

                insertPosition(newKorb.insertId);
              }
            );
          }
        }
      );
    }
  );
});

/*
  DELETE /warenkorb/position/:id
  Löscht eine einzelne Position aus dem Warenkorb.
*/
router.delete('/position/:id', (req, res) => {
  // ID der Warenkorb-Position aus der URL lesen
  const id = Number.parseInt(req.params.id, 10);

  // Prüfen, ob die ID gültig ist
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: 'Ungültige ID' });
  }

  // Position aus der Tabelle warenkorb_position löschen
  connection.query(
    'DELETE FROM warenkorb_position WHERE id = ?',
    [id],
    (error) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: 'Fehler beim Löschen' });
      }

      res.status(200).json({ message: 'Position entfernt' });
    }
  );
});

module.exports = router;