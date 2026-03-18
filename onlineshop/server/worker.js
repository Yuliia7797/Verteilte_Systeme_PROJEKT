'use strict';

const mysql = require('mysql');

// ─── Datenbankverbindung ────────────────────────────────────────────────────
const dbInfo = {
    connectionLimit: 10,
    host:     process.env.MYSQL_HOSTNAME,
    user:     process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
};

const connection = mysql.createPool(dbInfo);
console.log("Worker startet und verbindet sich mit der Datenbank...");

// ─── Hilfsfunktion: SQL als Promise ────────────────────────────────────────
// Der normale mysql-Pool arbeitet mit Callbacks. Diese Funktion macht daraus
// ein Promise, damit wir async/await verwenden können (sauberer, lesbarer).
function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        connection.query(sql, params, function (error, results) {
            if (error) reject(error);
            else resolve(results);
        });
    });
}

// ─── Worker in Datenbank registrieren ──────────────────────────────────────
// Beim Start trägt sich der Worker in die worker-Tabelle ein,
// damit die Admin-Oberfläche ihn anzeigen kann.
let workerId = null;

async function registerWorker() {
    const result = await query(
        "INSERT INTO worker (typ, status, letzter_heartbeat) VALUES ('allgemein', 'aktiv', NOW())"
    );
    workerId = result.insertId;
    console.log("Worker registriert mit ID:", workerId);
}

// ─── Heartbeat: Worker meldet sich alle 30 Sek. als aktiv ──────────────────
async function sendHeartbeat() {
    if (workerId) {
        await query(
            "UPDATE worker SET letzter_heartbeat = NOW() WHERE id = ?",
            [workerId]
        );
    }
}

// ─── Nächste offene Aufgabe holen ──────────────────────────────────────────
async function getNextTask() {
    const results = await query(
        "SELECT * FROM aufgabe WHERE status = 'wartend' ORDER BY id ASC LIMIT 1"
    );
    if (results.length === 0) return null;
    return results[0];
}

// ─── Aufgabenstatus setzen ──────────────────────────────────────────────────
async function markAsRunning(taskId) {
    await query(
        "UPDATE aufgabe SET status = 'in_bearbeitung', worker_id = ?, startzeitpunkt = NOW() WHERE id = ?",
        [workerId, taskId]
    );
}

async function markAsDone(taskId) {
    await query(
        "UPDATE aufgabe SET status = 'abgeschlossen', endzeitpunkt = NOW() WHERE id = ?",
        [taskId]
    );
}

async function markAsFailed(taskId, fehlermeldung) {
    await query(
        "UPDATE aufgabe SET status = 'fehlgeschlagen', fehlermeldung = ?, endzeitpunkt = NOW(), versuch_anzahl = versuch_anzahl + 1 WHERE id = ?",
        [fehlermeldung, taskId]
    );
}

// ════════════════════════════════════════════════════════════════════════════
// AUFGABEN-VERARBEITUNG
// Hier wird je nach Aufgaben-Typ die passende Logik ausgeführt.
// ════════════════════════════════════════════════════════════════════════════

// Aufgabe: Zahlung prüfen
// Setzt zahlungsstatus der Bestellung auf 'bezahlt'
async function zahlungPruefen(bestellungId) {
    console.log("  → Zahlung prüfen für Bestellung:", bestellungId);

    // Simulierte Prüfung (in echtem System: Zahlungsanbieter-API aufrufen)
    // Hier wird die Zahlung immer als erfolgreich gewertet
    await query(
        "UPDATE bestellung SET zahlungsstatus = 'bezahlt' WHERE id = ?",
        [bestellungId]
    );
    console.log("  ✓ Zahlung bestätigt für Bestellung:", bestellungId);
}

// Aufgabe: Lagerbestand aktualisieren
// Reduziert den Lagerbestand für jeden bestellten Artikel
async function lagerAktualisieren(bestellungId) {
    console.log("  → Lagerbestand aktualisieren für Bestellung:", bestellungId);

    // Alle Positionen dieser Bestellung laden
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

// Aufgabe: Bestellbestätigung senden
// Setzt bestellstatus auf 'bestaetigt'
async function bestaetigungSenden(bestellungId) {
    console.log("  → Bestellbestätigung senden für Bestellung:", bestellungId);

    await query(
        "UPDATE bestellung SET bestellstatus = 'bestaetigt' WHERE id = ?",
        [bestellungId]
    );

    // In echtem System: E-Mail über einen Mail-Service senden
    console.log("  ✓ Bestellbestätigung gespeichert für Bestellung:", bestellungId);
}

// ─── Einzelne Aufgabe verarbeiten ──────────────────────────────────────────
async function processTask(task) {
    console.log("Verarbeite Aufgabe ID:", task.id, "| Typ:", task.typ, "| Bestellung:", task.bestellung_id);

    await markAsRunning(task.id);

    try {
        // Je nach Aufgaben-Typ die passende Funktion aufrufen
        switch (task.typ) {
            case 'zahlung_pruefen':
                await zahlungPruefen(task.bestellung_id);
                break;

            case 'lager_aktualisieren':
                await lagerAktualisieren(task.bestellung_id);
                break;

            case 'bestaetigung_senden':
                await bestaetigungSenden(task.bestellung_id);
                break;

            default:
                console.warn("  ⚠ Unbekannter Aufgaben-Typ:", task.typ);
        }

        await markAsDone(task.id);
        console.log("✓ Aufgabe", task.id, "abgeschlossen");

    } catch (error) {
        // Fehler bei der Verarbeitung → als fehlgeschlagen markieren
        console.error("✗ Aufgabe", task.id, "fehlgeschlagen:", error.message);
        await markAsFailed(task.id, error.message);
    }
}

// ─── Haupt-Loop ────────────────────────────────────────────────────────────
// Der Worker prüft alle 5 Sekunden ob eine neue Aufgabe wartet.
// Das ist das "verteilte" Herzstück: Server legt Aufgaben an,
// Worker arbeitet sie unabhängig davon ab.
async function workerLoop() {
    console.log("Worker-Loop gestartet. Prüfe alle 5 Sekunden auf neue Aufgaben...");

    while (true) {
        try {
            const task = await getNextTask();

            if (task) {
                await processTask(task);
            } else {
                // Keine Aufgabe vorhanden → kurz warten
                process.stdout.write(".");  // Punkt im Terminal als Lebenszeichen
            }
        } catch (error) {
            console.error("Fehler im Worker-Loop:", error.message);
        }

        // 5 Sekunden warten bis zur nächsten Prüfung
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ─── Worker starten ────────────────────────────────────────────────────────
async function start() {
    try {
        // Kurz warten bis Datenbank bereit ist (Docker-Startzeit)
        await new Promise(resolve => setTimeout(resolve, 3000));

        await registerWorker();

        // Heartbeat alle 30 Sekunden senden
        setInterval(sendHeartbeat, 30000);

        // Haupt-Loop starten
        await workerLoop();

    } catch (error) {
        console.error("Worker konnte nicht starten:", error.message);
        process.exit(1);
    }
}

start();