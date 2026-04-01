'use strict';

const mysql = require('mysql');

const dbInfo = {
    connectionLimit: 10,
    host: process.env.MYSQL_HOSTNAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);
console.log('Worker startet und verbindet sich mit der Datenbank...');

// ─── Hilfsfunktion: einfache SQL-Abfrage ───────────────────────────────────
// Führt eine SQL-Abfrage über den Connection-Pool aus.
// Gibt bei Erfolg die Ergebnisse zurück, bei Fehler wird das Promise abgelehnt.
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, function (error, results) {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
}

// ─── Hilfsfunktion: dedizierte DB-Verbindung holen ─────────────────────────
// Wird für Transaktionen benötigt.
function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            } else {
                resolve(connection);
            }
        });
    });
}

let workerId = null;

// ─── Worker in der Datenbank registrieren ──────────────────────────────────
// Entfernt alte inaktive Worker und löst deren Aufgaben-Zuordnung.
// Danach wird dieser Worker als aktiv eingetragen.
async function registerWorker() {
    await query(
        `UPDATE aufgabe
         SET worker_id = NULL
         WHERE worker_id IN (
             SELECT id FROM worker WHERE status = 'inaktiv'
         )`
    );

    await query(
        "DELETE FROM worker WHERE status = 'inaktiv'"
    );

    const result = await query(
        "INSERT INTO worker (typ, status, letzter_heartbeat) VALUES ('allgemein', 'aktiv', NOW())"
    );

    workerId = result.insertId;
    console.log('Worker registriert mit ID:', workerId);
}

// ─── Heartbeat senden ──────────────────────────────────────────────────────
// Aktualisiert den letzten Heartbeat dieses Workers.
async function sendHeartbeat() {
    if (workerId) {
        await query(
            "UPDATE worker SET letzter_heartbeat = NOW() WHERE id = ?",
            [workerId]
        );
    }
}

// ─── Inaktive Worker erkennen und markieren ────────────────────────────────
// Setzt andere Worker auf 'inaktiv', wenn deren Heartbeat zu alt ist.
async function markInaktiveWorker() {
    await query(
        `UPDATE worker
         SET status = 'inaktiv'
         WHERE status = 'aktiv'
         AND id != ?
         AND letzter_heartbeat < DATE_SUB(NOW(), INTERVAL 60 SECOND)`,
        [workerId]
    );
}

// ─── Nächste wartende Aufgabe holen und für diesen Worker sperren ──────────
// Die Aufgabe wird in einer Transaktion gelesen und direkt auf
// 'in_bearbeitung' gesetzt, damit kein anderer Worker dieselbe Aufgabe greift.
async function getNextTask() {
    const conn = await getConnection();

    return new Promise((resolve, reject) => {
        conn.beginTransaction(function (err) {
            if (err) {
                conn.release();
                return reject(err);
            }

            conn.query(
                "SELECT * FROM aufgabe WHERE status = 'wartend' ORDER BY id ASC LIMIT 1 FOR UPDATE",
                function (err, results) {
                    if (err) {
                        return conn.rollback(() => {
                            conn.release();
                            reject(err);
                        });
                    }

                    if (results.length === 0) {
                        return conn.rollback(() => {
                            conn.release();
                            resolve(null);
                        });
                    }

                    const task = results[0];

                    conn.query(
                        `UPDATE aufgabe
                         SET status = 'in_bearbeitung',
                             worker_id = ?,
                             startzeitpunkt = NOW()
                         WHERE id = ?`,
                        [workerId, task.id],
                        function (err) {
                            if (err) {
                                return conn.rollback(() => {
                                    conn.release();
                                    reject(err);
                                });
                            }

                            conn.commit(function (err) {
                                conn.release();

                                if (err) {
                                    return reject(err);
                                }

                                resolve(task);
                            });
                        }
                    );
                }
            );
        });
    });
}

// ─── Aufgabe als abgeschlossen markieren ───────────────────────────────────
async function markAsDone(taskId) {
    await query(
        "UPDATE aufgabe SET status = 'abgeschlossen', endzeitpunkt = NOW() WHERE id = ?",
        [taskId]
    );
}

// ─── Aufgabe als fehlgeschlagen markieren ──────────────────────────────────
async function markAsFailed(taskId, fehlermeldung) {
    await query(
        `UPDATE aufgabe
         SET status = 'fehlgeschlagen',
             fehlermeldung = ?,
             endzeitpunkt = NOW(),
             versuch_anzahl = versuch_anzahl + 1
         WHERE id = ?`,
        [fehlermeldung, taskId]
    );
}

// ─── Hängengebliebene Aufgaben zurücksetzen ────────────────────────────────
// Setzt Aufgaben zurück auf 'wartend', wenn sie länger als 5 Minuten
// auf 'in_bearbeitung' stehen.
async function resetHaengengebliebeneAufgaben() {
    await query(
        `UPDATE aufgabe
         SET status = 'wartend',
             worker_id = NULL,
             startzeitpunkt = NULL
         WHERE status = 'in_bearbeitung'
         AND startzeitpunkt < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
}

// ─── Lagerbestand für eine Bestellung aktualisieren ────────────────────────
// Liest alle Bestellpositionen aus und reduziert den Lagerbestand.
async function lagerAktualisieren(bestellungId) {
    console.log('  -> Lagerbestand aktualisieren für Bestellung:', bestellungId);

    const positionen = await query(
        "SELECT artikel_id, anzahl FROM bestellposition WHERE bestellung_id = ?",
        [bestellungId]
    );

    for (const pos of positionen) {
        await query(
            "UPDATE lagerbestand SET anzahl = anzahl - ? WHERE artikel_id = ?",
            [pos.anzahl, pos.artikel_id]
        );

        console.log('  ✓ Lager reduziert: Artikel', pos.artikel_id, 'um', pos.anzahl, 'Stück');
    }
}

// ─── Bestellbestätigung verarbeiten ────────────────────────────────────────
// Simuliert das Senden einer Bestellbestätigung, indem der Bestellstatus
// in der Datenbank auf 'bestaetigt' gesetzt wird.
async function bestaetigungSenden(bestellungId) {
    console.log('  -> Bestellbestätigung senden für Bestellung:', bestellungId);

    await query(
        "UPDATE bestellung SET bestellstatus = 'bestaetigt' WHERE id = ?",
        [bestellungId]
    );

    console.log('  ✓ Bestellbestätigung gespeichert für Bestellung:', bestellungId);
}

// ─── Warenkorb für die Bestellung leeren ───────────────────────────────────
// Ermittelt über die Bestellung den Benutzer, findet dessen Warenkorb,
// löscht alle Positionen und setzt den Gesamtpreis auf 0.
async function warenkorbLeeren(bestellungId) {
    console.log('  -> Warenkorb leeren für Bestellung:', bestellungId);

    const bestellungResult = await query(
        "SELECT benutzer_id FROM bestellung WHERE id = ?",
        [bestellungId]
    );

    if (!bestellungResult.length) {
        throw new Error('Bestellung nicht gefunden');
    }

    const benutzerId = bestellungResult[0].benutzer_id;

    const warenkorbResult = await query(
        "SELECT id FROM warenkorb WHERE benutzer_id = ? LIMIT 1",
        [benutzerId]
    );

    if (!warenkorbResult.length) {
        console.log('  -> Kein Warenkorb für Benutzer gefunden:', benutzerId);
        return;
    }

    const warenkorbId = warenkorbResult[0].id;

    await query(
        "DELETE FROM warenkorb_position WHERE warenkorb_id = ?",
        [warenkorbId]
    );

    await query(
        "UPDATE warenkorb SET gesamtpreis = 0.00, aenderungszeitpunkt = NOW() WHERE id = ?",
        [warenkorbId]
    );

    console.log('  ✓ Warenkorb geleert für Benutzer:', benutzerId);
}

// ─── Zugewiesene Aufgabe verarbeiten ───────────────────────────────────────
// Führt abhängig vom Typ die passende Verarbeitung aus.
async function processTask(task) {
    console.log('Verarbeite Aufgabe ID:', task.id, '| Typ:', task.typ, '| Bestellung:', task.bestellung_id);

    try {
        switch (task.typ) {
            case 'lager_aktualisieren':
                await lagerAktualisieren(task.bestellung_id);
                break;

            case 'bestaetigung_senden':
                await bestaetigungSenden(task.bestellung_id);
                break;

            case 'warenkorb_leeren':
                await warenkorbLeeren(task.bestellung_id);
                break;

            default:
                console.warn('  Unbekannter Aufgaben-Typ:', task.typ);
        }

        await markAsDone(task.id);
        console.log('✓ Aufgabe', task.id, 'abgeschlossen');
    } catch (error) {
        console.error('Aufgabe', task.id, 'fehlgeschlagen:', error.message);
        await markAsFailed(task.id, error.message);
    }
}

// ─── Hauptschleife des Workers ─────────────────────────────────────────────
// Prüft regelmäßig auf neue wartende Aufgaben, übernimmt sie
// und verarbeitet sie.
async function workerLoop() {
    console.log('Worker-Loop gestartet. Prüfe alle 5 Sekunden auf neue Aufgaben...');
    await resetHaengengebliebeneAufgaben();

    while (true) {
        try {
            const task = await getNextTask();

            if (task) {
                await processTask(task);
            } else {
                process.stdout.write('.');
            }
        } catch (error) {
            console.error('Fehler im Worker-Loop:', error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ─── Worker-Prozess starten und überwachen ─────────────────────────────────
// Registriert den Worker und startet Heartbeats sowie Verarbeitungsschleife.
async function start() {
    let versuch = 0;

    while (true) {
        try {
            versuch++;
            console.log(`Verbindungsversuch ${versuch}...`);

            await new Promise(resolve => setTimeout(resolve, 5000));
            await registerWorker();

            setInterval(async () => {
                await sendHeartbeat();
                await markInaktiveWorker();
            }, 30000);

            await workerLoop();
        } catch (error) {
            console.error(`Versuch ${versuch} fehlgeschlagen: ${error.message}`);
            console.log('Warte 5 Sekunden und versuche erneut...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

start();