/**
 * Diese Datei definiert die API-Routen für den Warenkorb des aktuell
 * eingeloggten Benutzers.
 *
 * Verfügbare Endpunkte:
 * - GET    /warenkorb                           – aktuellen Warenkorb mit Positionen laden
 * - POST   /warenkorb/positionen                – Artikel zum Warenkorb hinzufügen
 * - PUT    /warenkorb/positionen/:artikel_id    – Artikelmenge ändern
 * - DELETE /warenkorb/positionen/:artikel_id    – Artikel aus Warenkorb entfernen
 * - DELETE /warenkorb/leeren                    – gesamten Warenkorb leeren
 */

'use strict';

const express = require('express');
const router = express.Router();
const connection = require('../db');

/**
 * Prüft, ob ein Benutzer eingeloggt ist.
 * Wenn kein Benutzer in der Session vorhanden ist, wird Status 401 zurückgegeben.
 *
 * @function requireLogin
 * @param {Object} req - Express Request
 * @param {Object} res - Express Response
 * @param {Function} next - Express Next-Funktion
 * @returns {void}
 */
function requireLogin(req, res, next) {
  if (!req.session || !req.session.benutzer || !req.session.benutzer.id) {
    return res.status(401).json({ message: 'Nicht eingeloggt' });
  }

  next();
}

/**
 * Berechnet den Gesamtpreis aller Positionen eines Warenkorbs
 * und speichert ihn in der Tabelle warenkorb.
 *
 * @function calculateTotal
 * @param {number} warenkorbId - ID des Warenkorbs
 * @param {Function} callback - Callback mit (error, total)
 * @returns {void}
 */
function calculateTotal(warenkorbId, callback) {
  connection.query(
    `SELECT COALESCE(SUM(gesamtpreis), 0) AS total
     FROM warenkorb_position
     WHERE warenkorb_id = ?`,
    [warenkorbId],
    (sumError, sumResults) => {
      if (sumError) {
        return callback(sumError);
      }

      const total = Number(sumResults[0].total) || 0;

      connection.query(
        `UPDATE warenkorb
         SET gesamtpreis = ?, aenderungszeitpunkt = NOW()
         WHERE id = ?`,
        [total, warenkorbId],
        (updateError) => {
          if (updateError) {
            return callback(updateError);
          }

          callback(null, total);
        }
      );
    }
  );
}

/**
 * Liefert den neuesten Warenkorb eines Benutzers.
 * Falls noch kein Warenkorb existiert, wird ein neuer erstellt.
 *
 * Wichtig:
 * Es kann vorkommen, dass für einen Benutzer mehrere Warenkörbe
 * in der Datenbank existieren. Deshalb wird hier gezielt der
 * neueste Warenkorb über die höchste ID geladen.
 *
 * @function getOrCreateWarenkorb
 * @param {number} benutzerId - ID des Benutzers
 * @param {Function} callback - Callback mit (error, warenkorb)
 * @returns {void}
 */
function getOrCreateWarenkorb(benutzerId, callback) {
  connection.query(
    `SELECT id, benutzer_id, gesamtpreis
     FROM warenkorb
     WHERE benutzer_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [benutzerId],
    (selectError, results) => {
      if (selectError) {
        return callback(selectError);
      }

      // Falls bereits ein Warenkorb existiert, den neuesten zurückgeben
      if (results.length > 0) {
        return callback(null, results[0]);
      }

      // Falls noch kein Warenkorb existiert, neuen Warenkorb anlegen
      connection.query(
        `INSERT INTO warenkorb (benutzer_id, gesamtpreis)
         VALUES (?, 0.00)`,
        [benutzerId],
        (insertError, insertResult) => {
          if (insertError) {
            return callback(insertError);
          }

          callback(null, {
            id: insertResult.insertId,
            benutzer_id: benutzerId,
            gesamtpreis: 0
          });
        }
      );
    }
  );
}

/**
 * Liefert die Zusammenfassung des Warenkorbs.
 * Enthält Artikelanzahl, Zwischensumme, Versandkosten und Gesamtsumme.
 *
 * @function getWarenkorbZusammenfassung
 * @param {number} warenkorbId - ID des Warenkorbs
 * @param {Function} callback - Callback mit (error, zusammenfassung)
 * @returns {void}
 */
function getWarenkorbZusammenfassung(warenkorbId, callback) {
  // Gesamte Artikelanzahl aus allen Positionen des Warenkorbs summieren.
  connection.query(
    `SELECT
       COALESCE(SUM(anzahl), 0) AS artikelanzahl
     FROM warenkorb_position
     WHERE warenkorb_id = ?`,
    [warenkorbId],
    (countError, countResults) => {
      if (countError) {
        return callback(countError);
      }

      const artikelanzahl = Number(countResults[0].artikelanzahl) || 0;

      // Aktuellen Gesamtpreis des Warenkorbs aus der warenkorb-Tabelle laden.
      connection.query(
        `SELECT gesamtpreis
         FROM warenkorb
         WHERE id = ?
         LIMIT 1`,
        [warenkorbId],
        (basketError, basketResults) => {
          if (basketError) {
            return callback(basketError);
          }

          const zwischensumme = basketResults.length > 0
            ? Number(basketResults[0].gesamtpreis) || 0
            : 0;

          // Versandkosten sind derzeit 0 – Ergebnis zusammenstellen und zurückgeben.
          const versand = 0;
          const gesamtsumme = zwischensumme + versand;

          callback(null, {
            artikelanzahl,
            zwischensumme,
            versand,
            gesamtsumme
          });
        }
      );
    }
  );
}

/*
  GET /warenkorb
  Lädt den Warenkorb des aktuell eingeloggten Benutzers
  inklusive aller Positionen und Zusammenfassung.
*/
router.get('/', requireLogin, (req, res) => {
  // Warenkorb des Benutzers laden oder bei erstem Aufruf neu anlegen.
  const benutzerId = req.session.benutzer.id;

  getOrCreateWarenkorb(benutzerId, (warenkorbError, warenkorb) => {
    if (warenkorbError) {
      console.error(warenkorbError);
      return res.status(500).json({ message: 'Fehler beim Laden des Warenkorbs' });
    }

    // Gesamtpreis neu berechnen, damit der Wert in der DB stets aktuell ist.
    calculateTotal(warenkorb.id, (totalError) => {
      if (totalError) {
        console.error(totalError);
        return res.status(500).json({ message: 'Fehler beim Berechnen des Gesamtpreises' });
      }

      // Alle Positionen mit Artikeldaten und aktuellem Lagerbestand laden.
      connection.query(
        `SELECT
           wp.id,
           wp.warenkorb_id,
           wp.artikel_id,
           wp.anzahl,
           wp.einzelpreis,
           wp.gesamtpreis,
           a.bezeichnung,
           a.beschreibung,
           a.bild_url,
           lb.anzahl AS lagerbestand
         FROM warenkorb_position wp
         INNER JOIN artikel a ON wp.artikel_id = a.id
         LEFT JOIN lagerbestand lb ON a.id = lb.artikel_id
         WHERE wp.warenkorb_id = ?
         ORDER BY wp.id ASC`,
        [warenkorb.id],
        (positionenError, positionen) => {
          if (positionenError) {
            console.error(positionenError);
            return res.status(500).json({ message: 'Fehler beim Laden der Warenkorb-Positionen' });
          }

          // Zusammenfassung mit Artikelanzahl, Zwischen- und Gesamtsumme berechnen.
          getWarenkorbZusammenfassung(warenkorb.id, (sumError, zusammenfassung) => {
            if (sumError) {
              console.error(sumError);
              return res.status(500).json({ message: 'Fehler beim Berechnen der Zusammenfassung' });
            }

            res.status(200).json({
              warenkorb_id: warenkorb.id,
              positionen,
              zusammenfassung
            });
          });
        }
      );
    });
  });
});

/*
  POST /warenkorb/positionen
  Fügt einen Artikel zum Warenkorb hinzu.
  Existiert der Artikel bereits, wird die Menge erhöht.
*/
router.post('/positionen', requireLogin, (req, res) => {
  // Artikel-ID und Anzahl aus dem Request lesen und grundlegend prüfen.
  const benutzerId = req.session.benutzer.id;
  const artikelId = Number.parseInt(req.body.artikel_id, 10);
  const anzahl = Number.parseInt(req.body.anzahl, 10);

  if (!Number.isInteger(artikelId) || !Number.isInteger(anzahl) || anzahl < 1) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID oder Anzahl' });
  }

  // Warenkorb des Benutzers laden oder neu erstellen.
  getOrCreateWarenkorb(benutzerId, (warenkorbError, warenkorb) => {
    if (warenkorbError) {
      console.error(warenkorbError);
      return res.status(500).json({ message: 'Fehler beim Laden des Warenkorbs' });
    }

    // Aktuellen Preis und Lagerbestand des Artikels aus der Datenbank laden.
    connection.query(
      `SELECT a.id, a.preis, lb.anzahl AS lagerbestand
       FROM artikel a
       LEFT JOIN lagerbestand lb ON a.id = lb.artikel_id
       WHERE a.id = ?
         AND a.ist_aktiv = 1
       LIMIT 1`,
      [artikelId],
      (artikelError, artikelResults) => {
        if (artikelError) {
          console.error(artikelError);
          return res.status(500).json({ message: 'Datenbankfehler beim Laden des Artikels' });
        }

        if (artikelResults.length === 0) {
          return res.status(404).json({ message: 'Artikel nicht gefunden oder nicht aktiv' });
        }

        // Preis, Lagerbestand und vorläufigen Gesamtpreis berechnen.
        const einzelpreis = Number(artikelResults[0].preis);
        const lagerbestand = Number(artikelResults[0].lagerbestand) || 0;
        const gesamtpreis = einzelpreis * anzahl;

        // Lagerbestandsgrenze prüfen, bevor der Artikel hinzugefügt wird.
        if (anzahl > lagerbestand) {
          return res.status(400).json({
            message: 'Die gewünschte Menge überschreitet den Lagerbestand'
          });
        }

        // Prüfen ob der Artikel bereits im Warenkorb vorhanden ist.
        connection.query(
          `SELECT id, anzahl
           FROM warenkorb_position
           WHERE warenkorb_id = ? AND artikel_id = ?
           LIMIT 1`,
          [warenkorb.id, artikelId],
          (positionError, positionResults) => {
            if (positionError) {
              console.error(positionError);
              return res.status(500).json({ message: 'Datenbankfehler beim Prüfen der Position' });
            }

            if (positionResults.length > 0) {
              // Artikel bereits im Warenkorb – Menge erhöhen statt neu einfügen.
              const vorhandenePosition = positionResults[0];
              const neueAnzahl = Number(vorhandenePosition.anzahl) + anzahl;

              if (neueAnzahl > lagerbestand) {
                return res.status(400).json({
                  message: 'Die gewünschte Menge überschreitet den Lagerbestand'
                });
              }

              const neuerGesamtpreis = einzelpreis * neueAnzahl;

              connection.query(
                `UPDATE warenkorb_position
                 SET anzahl = ?, einzelpreis = ?, gesamtpreis = ?, aenderungszeitpunkt = NOW()
                 WHERE id = ?`,
                [neueAnzahl, einzelpreis, neuerGesamtpreis, vorhandenePosition.id],
                (updateError) => {
                  if (updateError) {
                    console.error(updateError);
                    return res.status(500).json({ message: 'Fehler beim Aktualisieren der Position' });
                  }

                  calculateTotal(warenkorb.id, (totalError) => {
                    if (totalError) {
                      console.error(totalError);
                      return res.status(500).json({ message: 'Fehler beim Aktualisieren des Warenkorb-Gesamtpreises' });
                    }

                    res.status(200).json({ message: 'Artikelmenge im Warenkorb erhöht' });
                  });
                }
              );
            } else {
              // Artikel noch nicht im Warenkorb – neue Position anlegen.
              connection.query(
                `INSERT INTO warenkorb_position
                 (warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis)
                 VALUES (?, ?, ?, ?, ?)`,
                [warenkorb.id, artikelId, anzahl, einzelpreis, gesamtpreis],
                (insertError) => {
                  if (insertError) {
                    console.error(insertError);
                    return res.status(500).json({ message: 'Fehler beim Hinzufügen zum Warenkorb' });
                  }

                  calculateTotal(warenkorb.id, (totalError) => {
                    if (totalError) {
                      console.error(totalError);
                      return res.status(500).json({ message: 'Fehler beim Aktualisieren des Warenkorb-Gesamtpreises' });
                    }

                    res.status(201).json({ message: 'Artikel zum Warenkorb hinzugefügt' });
                  });
                }
              );
            }
          }
        );
      }
    );
  });
});

/*
  PUT /warenkorb/positionen/:artikel_id
  Aktualisiert die Menge eines Artikels im Warenkorb.
*/
router.put('/positionen/:artikel_id', requireLogin, (req, res) => {
  // Artikel-ID aus der URL und neue Menge aus dem Body lesen.
  const benutzerId = req.session.benutzer.id;
  const artikelId = Number.parseInt(req.params.artikel_id, 10);
  const anzahl = Number.parseInt(req.body.anzahl, 10);

  if (!Number.isInteger(artikelId) || !Number.isInteger(anzahl) || anzahl < 1) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID oder Anzahl' });
  }

  // Warenkorb des Benutzers laden.
  getOrCreateWarenkorb(benutzerId, (warenkorbError, warenkorb) => {
    if (warenkorbError) {
      console.error(warenkorbError);
      return res.status(500).json({ message: 'Fehler beim Laden des Warenkorbs' });
    }

    // Aktuellen Preis und Lagerbestand des Artikels laden.
    connection.query(
      `SELECT a.id, a.preis, lb.anzahl AS lagerbestand
       FROM artikel a
       LEFT JOIN lagerbestand lb ON a.id = lb.artikel_id
       WHERE a.id = ?
         AND a.ist_aktiv = 1
       LIMIT 1`,
      [artikelId],
      (artikelError, artikelResults) => {
        if (artikelError) {
          console.error(artikelError);
          return res.status(500).json({ message: 'Datenbankfehler beim Laden des Artikels' });
        }

        if (artikelResults.length === 0) {
          return res.status(404).json({ message: 'Artikel nicht gefunden oder nicht aktiv' });
        }

        // Neue Menge gegen den verfügbaren Lagerbestand prüfen.
        const einzelpreis = Number(artikelResults[0].preis);
        const lagerbestand = Number(artikelResults[0].lagerbestand) || 0;
        const gesamtpreis = einzelpreis * anzahl;

        if (anzahl > lagerbestand) {
          return res.status(400).json({
            message: 'Die gewünschte Menge überschreitet den Lagerbestand'
          });
        }

        // Position mit neuer Menge und berechnetem Gesamtpreis aktualisieren.
        connection.query(
          `UPDATE warenkorb_position
           SET anzahl = ?, einzelpreis = ?, gesamtpreis = ?, aenderungszeitpunkt = NOW()
           WHERE warenkorb_id = ? AND artikel_id = ?`,
          [anzahl, einzelpreis, gesamtpreis, warenkorb.id, artikelId],
          (updateError, updateResult) => {
            if (updateError) {
              console.error(updateError);
              return res.status(500).json({ message: 'Fehler beim Aktualisieren der Warenkorb-Position' });
            }

            if (updateResult.affectedRows === 0) {
              return res.status(404).json({ message: 'Artikel nicht im Warenkorb gefunden' });
            }

            // Warenkorb-Gesamtpreis nach der Änderung neu berechnen.
            calculateTotal(warenkorb.id, (totalError) => {
              if (totalError) {
                console.error(totalError);
                return res.status(500).json({ message: 'Fehler beim Aktualisieren des Warenkorb-Gesamtpreises' });
              }

              res.status(200).json({ message: 'Menge aktualisiert' });
            });
          }
        );
      }
    );
  });
});

/*
  DELETE /warenkorb/positionen/:artikel_id
  Entfernt einen Artikel aus dem Warenkorb.
*/
router.delete('/positionen/:artikel_id', requireLogin, (req, res) => {
  const benutzerId = req.session.benutzer.id;
  const artikelId = Number.parseInt(req.params.artikel_id, 10);

  if (!Number.isInteger(artikelId)) {
    return res.status(400).json({ message: 'Ungültige Artikel-ID' });
  }

  getOrCreateWarenkorb(benutzerId, (warenkorbError, warenkorb) => {
    if (warenkorbError) {
      console.error(warenkorbError);
      return res.status(500).json({ message: 'Fehler beim Laden des Warenkorbs' });
    }

    connection.query(
      `DELETE FROM warenkorb_position
       WHERE warenkorb_id = ? AND artikel_id = ?`,
      [warenkorb.id, artikelId],
      (deleteError, deleteResult) => {
        if (deleteError) {
          console.error(deleteError);
          return res.status(500).json({ message: 'Fehler beim Entfernen des Artikels' });
        }

        if (deleteResult.affectedRows === 0) {
          return res.status(404).json({ message: 'Artikel nicht im Warenkorb gefunden' });
        }

        calculateTotal(warenkorb.id, (totalError) => {
          if (totalError) {
            console.error(totalError);
            return res.status(500).json({ message: 'Fehler beim Aktualisieren des Warenkorb-Gesamtpreises' });
          }

          res.status(200).json({ message: 'Artikel aus dem Warenkorb entfernt' });
        });
      }
    );
  });
});

/*
  DELETE /warenkorb/leeren
  Entfernt alle Positionen aus dem Warenkorb des Benutzers.
*/
router.delete('/leeren', requireLogin, (req, res) => {
  const benutzerId = req.session.benutzer.id;

  getOrCreateWarenkorb(benutzerId, (warenkorbError, warenkorb) => {
    if (warenkorbError) {
      console.error(warenkorbError);
      return res.status(500).json({ message: 'Fehler beim Laden des Warenkorbs' });
    }

    connection.query(
      `DELETE FROM warenkorb_position
       WHERE warenkorb_id = ?`,
      [warenkorb.id],
      (deleteError) => {
        if (deleteError) {
          console.error(deleteError);
          return res.status(500).json({ message: 'Fehler beim Leeren des Warenkorbs' });
        }

        calculateTotal(warenkorb.id, (totalError) => {
          if (totalError) {
            console.error(totalError);
            return res.status(500).json({ message: 'Fehler beim Aktualisieren des Warenkorb-Gesamtpreises' });
          }

          res.status(200).json({ message: 'Warenkorb wurde geleert' });
        });
      }
    );
  });
});

module.exports = router;