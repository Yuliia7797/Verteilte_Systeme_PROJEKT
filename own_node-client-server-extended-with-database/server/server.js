'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const mysql = require('mysql');

// ─── Datenbankverbindung ────────────────────────────────────────────────────
var dbInfo = {
    connectionLimit: 10,
    host:     process.env.MYSQL_HOSTNAME,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

var connection = mysql.createPool(dbInfo);
console.log("Verbinde mit Datenbank...");

// Verbindungstest
connection.query('SELECT 1 + 1 AS solution', function (error, results) {
    if (error) throw error;
    if (results[0].solution == 2) {
        console.log("Datenbankverbindung erfolgreich");
    } else {
        console.error("Datenbankverbindung fehlgeschlagen!");
        process.exit(5);
    }
});

// ─── Express App ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';
const app  = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Rate Limiter (DoS-Schutz)
const limiter = rateLimit({
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000", 10),
    max:      Number.parseInt(process.env.RATE_LIMIT_MAX       || "10000", 10),
    standardHeaders: true,
    legacyHeaders:   false,
    message: { message: "Zu viele Anfragen. Bitte später erneut versuchen." }
});
app.use(limiter);

// Startseite → statische Seite
app.get('/', (req, res) => {
    res.redirect('/static');
});

// Statische Dateien aus dem Ordner "public"
app.use('/static', express.static('public'));


// ════════════════════════════════════════════════════════════════════════════
// ARTIKEL
// ════════════════════════════════════════════════════════════════════════════

// GET /artikel  →  alle Artikel abrufen
// Beispiel: GET http://localhost:8080/artikel
app.get('/artikel', (req, res) => {
    console.log("Alle Artikel abrufen");
    connection.query(
        `SELECT a.id, a.bezeichnung, a.beschreibung, a.preis, a.bild_url,
                k.bezeichnung AS kategorie
         FROM artikel a
         JOIN kategorie k ON a.kategorie_id = k.id`,
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler beim Abrufen der Artikel" });
            }
            res.status(200).json(results);
        }
    );
});

// GET /artikel/:id  →  einen einzelnen Artikel abrufen
// Beispiel: GET http://localhost:8080/artikel/3
app.get('/artikel/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige Artikel-ID" });
    }
    connection.query(
        `SELECT a.*, k.bezeichnung AS kategorie, l.anzahl AS lagerbestand
         FROM artikel a
         JOIN kategorie k ON a.kategorie_id = k.id
         LEFT JOIN lagerbestand l ON a.id = l.artikel_id
         WHERE a.id = ?`,
        [id],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            if (results.length === 0) {
                return res.status(404).json({ message: "Artikel nicht gefunden" });
            }
            res.status(200).json(results[0]);
        }
    );
});

// POST /artikel  →  neuen Artikel anlegen (Admin)
// Beispiel-Body: { "kategorie_id": 1, "bezeichnung": "T-Shirt", "beschreibung": "...", "preis": 19.99, "bild_url": "..." }
app.post('/artikel', (req, res) => {
    const { kategorie_id, bezeichnung, beschreibung, preis, bild_url } = req.body;
    if (!kategorie_id || !bezeichnung || !preis) {
        return res.status(400).json({ message: "kategorie_id, bezeichnung und preis sind Pflichtfelder" });
    }
    connection.query(
        "INSERT INTO artikel (kategorie_id, bezeichnung, beschreibung, preis, bild_url) VALUES (?, ?, ?, ?, ?)",
        [kategorie_id, bezeichnung, beschreibung || null, preis, bild_url || null],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Anlegen des Artikels" });
            }
            res.status(201).json({ message: "Artikel angelegt", id: results.insertId });
        }
    );
});

// DELETE /artikel/:id  →  Artikel löschen (Admin)
// Beispiel: DELETE http://localhost:8080/artikel/3
app.delete('/artikel/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige ID" });
    }
    connection.query("DELETE FROM artikel WHERE id = ?", [id], function (error, results) {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Fehler beim Löschen" });
        }
        res.status(200).json({ message: "Artikel gelöscht" });
    });
});


// ════════════════════════════════════════════════════════════════════════════
// KATEGORIEN
// ════════════════════════════════════════════════════════════════════════════

// GET /kategorien  →  alle Kategorien abrufen
// Beispiel: GET http://localhost:8080/kategorien
app.get('/kategorien', (req, res) => {
    connection.query("SELECT * FROM kategorie", function (error, results) {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Datenbankfehler" });
        }
        res.status(200).json(results);
    });
});


// ════════════════════════════════════════════════════════════════════════════
// WARENKORB
// ════════════════════════════════════════════════════════════════════════════

// GET /warenkorb/:benutzer_id  →  Warenkorb eines Benutzers abrufen
// Beispiel: GET http://localhost:8080/warenkorb/1
app.get('/warenkorb/:benutzer_id', (req, res) => {
    const benutzer_id = Number.parseInt(req.params.benutzer_id, 10);
    if (!Number.isInteger(benutzer_id)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
    }
    connection.query(
        `SELECT wp.id, wp.anzahl, wp.einzelpreis, wp.gesamtpreis,
                a.bezeichnung AS artikel, a.bild_url
         FROM warenkorb w
         JOIN warenkorb_position wp ON w.id = wp.warenkorb_id
         JOIN artikel a ON wp.artikel_id = a.id
         WHERE w.benutzer_id = ?`,
        [benutzer_id],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});

// POST /warenkorb  →  Artikel in den Warenkorb legen
// Beispiel-Body: { "benutzer_id": 1, "artikel_id": 5, "anzahl": 2 }
app.post('/warenkorb', (req, res) => {
    const { benutzer_id, artikel_id, anzahl } = req.body;
    if (!benutzer_id || !artikel_id || !anzahl) {
        return res.status(400).json({ message: "benutzer_id, artikel_id und anzahl sind Pflichtfelder" });
    }

    // Preis des Artikels laden
    connection.query("SELECT preis FROM artikel WHERE id = ?", [artikel_id], function (error, artikelResult) {
        if (error || artikelResult.length === 0) {
            return res.status(404).json({ message: "Artikel nicht gefunden" });
        }

        const einzelpreis = artikelResult[0].preis;
        const gesamtpreis = einzelpreis * anzahl;

        // Warenkorb des Benutzers suchen oder neu anlegen
        connection.query(
            "SELECT id FROM warenkorb WHERE benutzer_id = ?",
            [benutzer_id],
            function (error, korbResult) {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ message: "Datenbankfehler" });
                }

                const insertPosition = (warenkorb_id) => {
                    connection.query(
                        "INSERT INTO warenkorb_position (warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis) VALUES (?, ?, ?, ?, ?)",
                        [warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis],
                        function (error, results) {
                            if (error) {
                                console.error(error);
                                return res.status(500).json({ message: "Fehler beim Hinzufügen" });
                            }
                            res.status(201).json({ message: "Artikel in Warenkorb gelegt", id: results.insertId });
                        }
                    );
                };

                if (korbResult.length > 0) {
                    // Warenkorb existiert bereits
                    insertPosition(korbResult[0].id);
                } else {
                    // Neuen Warenkorb anlegen
                    connection.query(
                        "INSERT INTO warenkorb (benutzer_id) VALUES (?)",
                        [benutzer_id],
                        function (error, newKorb) {
                            if (error) {
                                console.error(error);
                                return res.status(500).json({ message: "Fehler beim Erstellen des Warenkorbs" });
                            }
                            insertPosition(newKorb.insertId);
                        }
                    );
                }
            }
        );
    });
});

// DELETE /warenkorb/position/:id  →  Position aus Warenkorb entfernen
// Beispiel: DELETE http://localhost:8080/warenkorb/position/4
app.delete('/warenkorb/position/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige ID" });
    }
    connection.query("DELETE FROM warenkorb_position WHERE id = ?", [id], function (error) {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Fehler beim Löschen" });
        }
        res.status(200).json({ message: "Position entfernt" });
    });
});


// ════════════════════════════════════════════════════════════════════════════
// BESTELLUNG
// ════════════════════════════════════════════════════════════════════════════

// GET /bestellung  →  alle Bestellungen abrufen (Admin)
// Beispiel: GET http://localhost:8080/bestellung
app.get('/bestellung', (req, res) => {
    connection.query(
        `SELECT b.id, b.gesamtpreis, b.zahlungsmethode, b.zahlungsstatus,
                b.bestellstatus, b.erstellungszeitpunkt,
                bn.vorname, bn.nachname, bn.email
         FROM bestellung b
         JOIN benutzer bn ON b.benutzer_id = bn.id
         ORDER BY b.erstellungszeitpunkt DESC`,
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});

// GET /bestellung/:id  →  eine Bestellung mit allen Positionen abrufen
// Beispiel: GET http://localhost:8080/bestellung/1
app.get('/bestellung/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige ID" });
    }

    // Bestellung laden
    connection.query(
        `SELECT b.*, bn.vorname, bn.nachname, bn.email,
                a.strasse, a.hausnummer, a.postleitzahl, a.ort, a.land
         FROM bestellung b
         JOIN benutzer bn ON b.benutzer_id = bn.id
         JOIN adresse a ON b.lieferadresse_id = a.id
         WHERE b.id = ?`,
        [id],
        function (error, bestellungResult) {
            if (error || bestellungResult.length === 0) {
                return res.status(404).json({ message: "Bestellung nicht gefunden" });
            }

            // Positionen der Bestellung laden
            connection.query(
                `SELECT bp.anzahl, bp.einzelpreis, bp.gesamtpreis,
                        ar.bezeichnung AS artikel
                 FROM bestellposition bp
                 JOIN artikel ar ON bp.artikel_id = ar.id
                 WHERE bp.bestellung_id = ?`,
                [id],
                function (error, positionenResult) {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ message: "Datenbankfehler bei Positionen" });
                    }
                    const antwort = {
                        bestellung: bestellungResult[0],
                        positionen: positionenResult
                    };
                    res.status(200).json(antwort);
                }
            );
        }
    );
});

// POST /bestellung  →  neue Bestellung aufgeben
// Beispiel-Body:
// {
//   "benutzer_id": 1,
//   "lieferadresse_id": 2,
//   "zahlungsmethode": "Kreditkarte",
//   "positionen": [
//     { "artikel_id": 3, "anzahl": 2 },
//     { "artikel_id": 7, "anzahl": 1 }
//   ]
// }
app.post('/bestellung', (req, res) => {
    const { benutzer_id, lieferadresse_id, zahlungsmethode, positionen } = req.body;

    if (!benutzer_id || !lieferadresse_id || !zahlungsmethode || !positionen || positionen.length === 0) {
        return res.status(400).json({ message: "benutzer_id, lieferadresse_id, zahlungsmethode und positionen sind Pflichtfelder" });
    }

    // Preise aller bestellten Artikel laden
    const artikelIds = positionen.map(p => p.artikel_id);
    connection.query(
        "SELECT id, preis FROM artikel WHERE id IN (?)",
        [artikelIds],
        function (error, artikelResult) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Laden der Artikelpreise" });
            }

            // Preismap aufbauen: { artikelId: preis }
            const preisMap = {};
            artikelResult.forEach(a => { preisMap[a.id] = parseFloat(a.preis); });

            // Gesamtpreis berechnen
            let gesamtpreis = 0;
            for (const pos of positionen) {
                if (!preisMap[pos.artikel_id]) {
                    return res.status(400).json({ message: "Artikel " + pos.artikel_id + " nicht gefunden" });
                }
                gesamtpreis += preisMap[pos.artikel_id] * pos.anzahl;
            }
            gesamtpreis = Math.round(gesamtpreis * 100) / 100;

            // Bestellung in DB einfügen
            connection.query(
                `INSERT INTO bestellung (benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode, zahlungsstatus, bestellstatus)
                 VALUES (?, ?, ?, ?, 'ausstehend', 'neu')`,
                [benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode],
                function (error, bestellungResult) {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ message: "Fehler beim Erstellen der Bestellung" });
                    }

                    const bestellung_id = bestellungResult.insertId;

                    // Bestellpositionen einfügen
                    const positionenWerte = positionen.map(pos => [
                        bestellung_id,
                        pos.artikel_id,
                        pos.anzahl,
                        preisMap[pos.artikel_id],
                        preisMap[pos.artikel_id] * pos.anzahl
                    ]);

                    connection.query(
                        "INSERT INTO bestellposition (bestellung_id, artikel_id, anzahl, einzelpreis, gesamtpreis) VALUES ?",
                        [positionenWerte],
                        function (error) {
                            if (error) {
                                console.error(error);
                                return res.status(500).json({ message: "Fehler beim Speichern der Positionen" });
                            }

                            // Aufgaben für Worker anlegen (verteiltes System)
                            const aufgaben = [
                                [bestellung_id, null, 'zahlung_pruefen',     'wartend'],
                                [bestellung_id, null, 'lager_aktualisieren', 'wartend'],
                                [bestellung_id, null, 'bestaetigung_senden', 'wartend']
                            ];
                            connection.query(
                                "INSERT INTO aufgabe (bestellung_id, worker_id, typ, status) VALUES ?",
                                [aufgaben],
                                function (error) {
                                    if (error) {
                                        console.error(error);
                                        // Bestellung wurde gespeichert, Aufgaben nicht — trotzdem 201 zurückgeben
                                        return res.status(201).json({
                                            message: "Bestellung erstellt, Aufgaben konnten nicht angelegt werden",
                                            bestellung_id
                                        });
                                    }
                                    console.log("Bestellung " + bestellung_id + " erstellt, Aufgaben angelegt");
                                    res.status(201).json({ message: "Bestellung erfolgreich erstellt", bestellung_id, gesamtpreis });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
});

// PATCH /bestellung/:id/status  →  Bestellstatus aktualisieren
// Beispiel-Body: { "bestellstatus": "versendet" }
app.patch('/bestellung/:id/status', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    const { bestellstatus } = req.body;
    if (!Number.isInteger(id) || !bestellstatus) {
        return res.status(400).json({ message: "Ungültige ID oder fehlender bestellstatus" });
    }
    connection.query(
        "UPDATE bestellung SET bestellstatus = ? WHERE id = ?",
        [bestellstatus, id],
        function (error) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Aktualisieren" });
            }
            res.status(200).json({ message: "Status aktualisiert auf: " + bestellstatus });
        }
    );
});


// ════════════════════════════════════════════════════════════════════════════
// LAGERBESTAND
// ════════════════════════════════════════════════════════════════════════════

// GET /lagerbestand  →  gesamten Lagerbestand abrufen
// Beispiel: GET http://localhost:8080/lagerbestand
app.get('/lagerbestand', (req, res) => {
    connection.query(
        `SELECT l.id, l.anzahl, l.aenderungszeitpunkt,
                a.bezeichnung AS artikel, a.id AS artikel_id
         FROM lagerbestand l
         JOIN artikel a ON l.artikel_id = a.id`,
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});

// PATCH /lagerbestand/:artikel_id  →  Lagerbestand eines Artikels aktualisieren
// Beispiel-Body: { "anzahl": 50 }
app.patch('/lagerbestand/:artikel_id', (req, res) => {
    const artikel_id = Number.parseInt(req.params.artikel_id, 10);
    const { anzahl } = req.body;
    if (!Number.isInteger(artikel_id) || anzahl === undefined) {
        return res.status(400).json({ message: "Ungültige Artikel-ID oder fehlende Anzahl" });
    }
    connection.query(
        `INSERT INTO lagerbestand (artikel_id, anzahl) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE anzahl = ?`,
        [artikel_id, anzahl, anzahl],
        function (error) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Aktualisieren des Lagerbestands" });
            }
            res.status(200).json({ message: "Lagerbestand aktualisiert", artikel_id, anzahl });
        }
    );
});


// ════════════════════════════════════════════════════════════════════════════
// WORKER (Admin-Übersicht)
// ════════════════════════════════════════════════════════════════════════════

// GET /worker  →  alle Worker anzeigen
// Beispiel: GET http://localhost:8080/worker
app.get('/worker', (req, res) => {
    connection.query("SELECT * FROM worker ORDER BY erstellungszeitpunkt DESC", function (error, results) {
        if (error) {
            console.error(error);
            return res.status(500).json({ message: "Datenbankfehler" });
        }
        res.status(200).json(results);
    });
});

// GET /aufgaben  →  alle Aufgaben anzeigen (Admin-Übersicht)
// Beispiel: GET http://localhost:8080/aufgaben
app.get('/aufgaben', (req, res) => {
    connection.query(
        `SELECT au.id, au.typ, au.status, au.versuch_anzahl, au.fehlermeldung,
                au.erstellungszeitpunkt, au.startzeitpunkt, au.endzeitpunkt,
                b.bestellstatus, w.typ AS worker_typ
         FROM aufgabe au
         LEFT JOIN bestellung b ON au.bestellung_id = b.id
         LEFT JOIN worker w ON au.worker_id = w.id
         ORDER BY au.erstellungszeitpunkt DESC`,
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});


// ════════════════════════════════════════════════════════════════════════════
// BENUTZER
// ════════════════════════════════════════════════════════════════════════════

// GET /benutzer  →  alle Benutzer abrufen (Admin)
// Beispiel: GET http://localhost:8080/benutzer
app.get('/benutzer', (req, res) => {
    connection.query(
        "SELECT id, vorname, nachname, email, rolle, erstellungszeitpunkt FROM benutzer",
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});

// POST /benutzer  →  neuen Benutzer registrieren
// Beispiel-Body: { "vorname": "Max", "nachname": "Mustermann", "email": "max@example.com", "passwort_hash": "abc123", "rolle": "kunde" }
app.post('/benutzer', (req, res) => {
    const { vorname, nachname, email, passwort_hash, rolle } = req.body;
    if (!vorname || !nachname || !email || !passwort_hash || !rolle) {
        return res.status(400).json({ message: "Alle Felder sind Pflicht: vorname, nachname, email, passwort_hash, rolle" });
    }
    connection.query(
        "INSERT INTO benutzer (vorname, nachname, email, passwort_hash, rolle) VALUES (?, ?, ?, ?, ?)",
        [vorname, nachname, email, passwort_hash, rolle],
        function (error, results) {
            if (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: "E-Mail-Adresse bereits vergeben" });
                }
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Registrieren" });
            }
            res.status(201).json({ message: "Benutzer registriert", id: results.insertId });
        }
    );
});


// ════════════════════════════════════════════════════════════════════════════
// ADRESSE
// ════════════════════════════════════════════════════════════════════════════

// GET /adresse/:benutzer_id  →  alle Adressen eines Benutzers abrufen
// Beispiel: GET http://localhost:8080/adresse/1
app.get('/adresse/:benutzer_id', (req, res) => {
    const benutzer_id = Number.parseInt(req.params.benutzer_id, 10);
    if (!Number.isInteger(benutzer_id)) {
        return res.status(400).json({ message: "Ungültige Benutzer-ID" });
    }
    connection.query(
        "SELECT * FROM adresse WHERE benutzer_id = ?",
        [benutzer_id],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Datenbankfehler" });
            }
            res.status(200).json(results);
        }
    );
});

// POST /adresse  →  neue Adresse für einen Benutzer speichern
// Wird aufgerufen wenn ein Kunde sich registriert oder eine neue Adresse hinzufügt

app.post('/adresse', (req, res) => {
    const { benutzer_id, strasse, hausnummer, postleitzahl, ort, land, adresszusatz } = req.body;
    if (!benutzer_id || !strasse || !hausnummer || !postleitzahl || !ort || !land) {
        return res.status(400).json({ message: "Pflichtfelder: benutzer_id, strasse, hausnummer, postleitzahl, ort, land" });
    }
    connection.query(
        "INSERT INTO adresse (benutzer_id, strasse, hausnummer, adresszusatz, postleitzahl, ort, land) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [benutzer_id, strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Speichern der Adresse" });
            }
            res.status(201).json({ message: "Adresse gespeichert", id: results.insertId });
        }
    );
});

// PUT /adresse/:id  →  eine bestehende Adresse vollständig aktualisieren
// Wird aufgerufen wenn ein Kunde seine Adresse im Profil ändert
// Beispiel: PUT http://localhost:8080/adresse/1

app.put('/adresse/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige ID" });
    }
    const { strasse, hausnummer, adresszusatz, postleitzahl, ort, land } = req.body;
    if (!strasse || !hausnummer || !postleitzahl || !ort || !land) {
        return res.status(400).json({ message: "Pflichtfelder: strasse, hausnummer, postleitzahl, ort, land" });
    }
    connection.query(
        "UPDATE adresse SET strasse = ?, hausnummer = ?, adresszusatz = ?, postleitzahl = ?, ort = ?, land = ? WHERE id = ?",
        [strasse, hausnummer, adresszusatz || null, postleitzahl, ort, land, id],
        function (error, results) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Aktualisieren der Adresse" });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Adresse nicht gefunden" });
            }
            res.status(200).json({ message: "Adresse aktualisiert" });
        }
    );
});

// DELETE /adresse/:id  →  eine Adresse löschen
// Beispiel: DELETE http://localhost:8080/adresse/1
app.delete('/adresse/:id', (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "Ungültige ID" });
    }
    connection.query(
        "DELETE FROM adresse WHERE id = ?",
        [id],
        function (error) {
            if (error) {
                console.error(error);
                return res.status(500).json({ message: "Fehler beim Löschen" });
            }
            res.status(200).json({ message: "Adresse gelöscht" });
        }
    );
});


// ════════════════════════════════════════════════════════════════════════════
// SERVER STARTEN
// ════════════════════════════════════════════════════════════════════════════
app.listen(PORT, HOST);
console.log(`Server läuft auf http://${HOST}:${PORT}`);