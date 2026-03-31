'use strict';

const mysql = require('mysql');

const dbInfo = {
    connectionLimit: 10,
    host:     process.env.MYSQL_HOSTNAME,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const pool = mysql.createPool(dbInfo);
console.log("Worker startet und verbindet sich mit der Datenbank...");

// ─── Hilfsfunktion: einfache SQL-Abfrage ───────────────────────────────────
// Führt eine SQL-Abfrage über den Connection-Pool aus.
// Gibt bei Erfolg die Ergebnisse zurück, bei Fehler wird das Promise abgelehnt.
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(sql, params, function (error, results) {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

// ─── Hilfsfunktion: Transaktion über eine dedizierte Verbindung ─────────────
// Pool unterstützt kein beginTransaction direkt — wir holen eine
// einzelne Verbindung aus dem Pool und geben sie danach zurück.
function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection(function(err, connection) {
            if (err) reject(err);
            else resolve(connection);
        });
    });
}

let workerId = null;

// ─── Worker in der Datenbank registrieren ──────────────────────────────────
// Entfernt zuerst alte inaktive Worker aus der Datenbank und löst deren
// Zuordnungen von Aufgaben. Danach wird dieser Worker als aktiv eingetragen
// und seine neue workerId gespeichert.
async function registerWorker() {
    // Nur inaktive Worker löschen — aktive Worker die gerade laufen
    // werden nicht angefasst
    await query(
        `UPDATE aufgabe SET worker_id = NULL
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
    console.log("Worker registriert mit ID:", workerId);
}

// ─── Worker in der Datenbank registrieren ──────────────────────────────────
// Entfernt zuerst alte inaktive Worker aus der Datenbank und löst deren
// Zuordnungen von Aufgaben. Danach wird dieser Worker als aktiv eingetragen
// und seine neue workerId gespeichert.
async function sendHeartbeat() {
    if (workerId) {
        await query(
            "UPDATE worker SET letzter_heartbeat = NOW() WHERE id = ?",
            [workerId]
        );
    }
}

// ─── Inaktive Worker erkennen und markieren ────────────────────────────────
// Setzt Worker auf 'inaktiv', wenn deren letzter Heartbeat älter als
// 60 Sekunden ist. Der aktuelle Worker selbst wird dabei ausgeschlossen.
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

// ─── Dem Worker zugewiesene Aufgabe holen ──────────────────────────────────
// Sucht die nächste Aufgabe, die diesem Worker bereits vom Controller
// zugewiesen wurde. Es werden nur Aufgaben mit Status 'zugewiesen' geholt.
async function getAssignedTask() {
    const results = await query(
        `SELECT * FROM aufgabe
         WHERE worker_id = ?
         AND status = 'zugewiesen'
         ORDER BY id ASC
         LIMIT 1`,
        [workerId]
    );

    return results.length ? results[0] : null;
}

// ─── Nächste offene Aufgabe holen (mit Transaktion) ─────────────────────────
// FOR UPDATE sperrt die Zeile damit kein anderer Worker
// gleichzeitig dieselbe Aufgabe greift.

/* async function getNextTask() {
    const conn = await getConnection();

    return new Promise((resolve, reject) => {
        conn.beginTransaction(function(err) {
            if (err) {
                conn.release();
                return reject(err);
            }

            conn.query(
                "SELECT * FROM aufgabe WHERE worker_id = 'wartend' ORDER BY id ASC LIMIT 1 FOR UPDATE",
                function(err, results) {
                    if (err) {
                        return conn.rollback(() => { conn.release(); reject(err); });
                    }
                    if (results.length === 0) {
                        return conn.rollback(() => { conn.release(); resolve(null); });
                    }

                    const task = results[0];
                    conn.query(
                        "UPDATE aufgabe SET status = 'in_bearbeitung', worker_id = ?, startzeitpunkt = NOW() WHERE id = ?",
                        [workerId, task.id],
                        function(err) {
                            if (err) {
                                return conn.rollback(() => { conn.release(); reject(err); });
                            }
                            conn.commit(function(err) {
                                conn.release();
                                if (err) return reject(err);
                                resolve(task);
                            });
                        }
                    );
                }
            );
        });
    });
} */

// ─── Aufgabe als abgeschlossen markieren ───────────────────────────────────
// Setzt den Status der Aufgabe auf 'abgeschlossen' und speichert den
// Endzeitpunkt der Bearbeitung.
async function markAsDone(taskId) {
    await query(
        "UPDATE aufgabe SET status = 'abgeschlossen', endzeitpunkt = NOW() WHERE id = ?",
        [taskId]
    );
}

// ─── Aufgabe als fehlgeschlagen markieren ──────────────────────────────────
// Setzt den Status der Aufgabe auf 'fehlgeschlagen', speichert die
// Fehlermeldung, setzt den Endzeitpunkt und erhöht die Versuchszahl.
async function markAsFailed(taskId, fehlermeldung) {
    await query(
        "UPDATE aufgabe SET status = 'fehlgeschlagen', fehlermeldung = ?, endzeitpunkt = NOW(), versuch_anzahl = versuch_anzahl + 1 WHERE id = ?",
        [fehlermeldung, taskId]
    );
}

// ─── Hängengebliebene Aufgaben zurücksetzen ────────────────────────────────
// Setzt Aufgaben zurück auf 'wartend', wenn sie länger als 5 Minuten
// auf 'in_bearbeitung' stehen. So können sie später neu verteilt werden.
async function resetHaengengebliebeneAufgaben() {
    await query(
        `UPDATE aufgabe
         SET status = 'wartend', worker_id = NULL
         WHERE status = 'in_bearbeitung'
         AND startzeitpunkt < DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
}

// ─── Zahlung einer Bestellung prüfen ───────────────────────────────────────
// Simuliert die Prüfung der Zahlung und setzt den Zahlungsstatus der
// Bestellung in der Datenbank auf 'bezahlt'.
async function zahlungPruefen(bestellungId) {
    console.log("  -> Zahlung bereits beim Bestellabschluss verarbeitet für Bestellung:", bestellungId);
    console.log("  ✓ Kein weiteres Update des Zahlungsstatus notwendig für Bestellung:", bestellungId);
}

// ─── Lagerbestand für eine Bestellung aktualisieren ────────────────────────
// Liest alle Positionen der Bestellung aus und reduziert den Lagerbestand
// der jeweiligen Artikel um die bestellte Menge.
async function lagerAktualisieren(bestellungId) {
    console.log("  -> Lagerbestand aktualisieren für Bestellung:", bestellungId);
    const positionen = await query(
        "SELECT artikel_id, anzahl FROM bestellposition WHERE bestellung_id = ?",
        [bestellungId]
    );
    for (const pos of positionen) {
        await query(
            "UPDATE lagerbestand SET anzahl = anzahl - ? WHERE artikel_id = ?",
            [pos.anzahl, pos.artikel_id]
        );
        console.log("  ✓ Lager reduziert: Artikel", pos.artikel_id, "um", pos.anzahl, "Stück");
    }
}

// ─── Bestellbestätigung verarbeiten ────────────────────────────────────────
// Simuliert das Senden einer Bestellbestätigung, indem der Bestellstatus
// in der Datenbank auf 'bestaetigt' gesetzt wird.
async function bestaetigungSenden(bestellungId) {
    console.log("  -> Bestellbestätigung senden für Bestellung:", bestellungId);
    await query("UPDATE bestellung SET bestellstatus = 'bestaetigt' WHERE id = ?", [bestellungId]);
    console.log("  ✓ Bestellbestätigung gespeichert für Bestellung:", bestellungId);
}

// ─── Zugewiesene Aufgabe verarbeiten ───────────────────────────────────────
// Führt abhängig vom Typ der Aufgabe die passende Bearbeitungsfunktion aus.
// Bei Erfolg wird die Aufgabe abgeschlossen, bei Fehler als fehlgeschlagen markiert.
async function processTask(task) {
    console.log("Verarbeite Aufgabe ID:", task.id, "| Typ:", task.typ, "| Bestellung:", task.bestellung_id);
    try {
        switch (task.typ) {
            case 'zahlung_pruefen':     await zahlungPruefen(task.bestellung_id);     break;
            case 'lager_aktualisieren': await lagerAktualisieren(task.bestellung_id); break;
            case 'bestaetigung_senden': await bestaetigungSenden(task.bestellung_id); break;
            default: console.warn("  Unbekannter Aufgaben-Typ:", task.typ);
        }
        await markAsDone(task.id);
        console.log("✓ Aufgabe", task.id, "abgeschlossen");
    } catch (error) {
        console.error("Aufgabe", task.id, "fehlgeschlagen:", error.message);
        await markAsFailed(task.id, error.message);
    }
}

// ─── Hauptschleife des Workers ─────────────────────────────────────────────
// Prüft regelmäßig, ob diesem Worker eine Aufgabe vom Controller
// zugewiesen wurde. Falls ja, wird sie gestartet und verarbeitet.
async function workerLoop() {
    console.log("Worker-Loop gestartet. Prüfe alle 5 Sekunden auf neue Aufgaben...");
    await resetHaengengebliebeneAufgaben();
    while (true) {
        try {
            const task = await getAssignedTask();
            if (task) {
                await startTask(task.id);
                await processTask(task);
            } else {
                process.stdout.write(".");
            }
        } catch (error) {
            console.error("Fehler im Worker-Loop:", error.message);
        }
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ─── Zugewiesene Aufgabe starten ───────────────────────────────────────────
// Setzt eine dem Worker zugewiesene Aufgabe auf 'in_bearbeitung' und
// speichert den Startzeitpunkt. Nur Aufgaben dieses Workers werden geändert.
async function startTask(taskId) {
    await query(
        `UPDATE aufgabe
         SET status = 'in_bearbeitung', startzeitpunkt = NOW()
         WHERE id = ?
         AND worker_id = ?`,
        [taskId, workerId]
    );
}

// ─── Worker-Prozess starten und überwachen ─────────────────────────────────
// Versucht wiederholt, den Worker zu registrieren und danach die
// Heartbeats sowie die Verarbeitungsschleife zu starten.
// Bei Fehlern wird nach kurzer Wartezeit ein neuer Versuch gestartet.
async function start() {
    let versuch = 0;
    while (true) {
        try {
            versuch++;
            console.log(`Verbindungsversuch ${versuch}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await registerWorker();
            setInterval(async () => { await sendHeartbeat(); await markInaktiveWorker(); }, 30000);
            await workerLoop();
        } catch (error) {
            console.error(`Versuch ${versuch} fehlgeschlagen: ${error.message}`);
            console.log("Warte 5 Sekunden und versuche erneut...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

start();