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

console.log("Controller startet und verbindet sich mit der Datenbank...");

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

// ─── Nächste wartende Aufgabe holen ────────────────────────────────────────
// Sucht die nächste offene Aufgabe mit dem Status 'wartend'.
// Es wird immer nur eine Aufgabe geholt, und zwar die mit der kleinsten ID.
async function getWaitingTask() {
    const results = await query(
        `SELECT *
         FROM aufgabe
         WHERE status = 'wartend'
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}

// ─── Freien aktiven Worker finden ──────────────────────────────────────────
// Sucht einen aktiven Worker, der aktuell keine Aufgabe mit Status
// 'zugewiesen' oder 'in_bearbeitung' bearbeitet.
async function getFreeWorker() {
    const results = await query(
        `SELECT *
         FROM worker
         WHERE status = 'aktiv'
         AND id NOT IN (
             SELECT worker_id
             FROM aufgabe
             WHERE status IN ('zugewiesen', 'in_bearbeitung')
             AND worker_id IS NOT NULL
         )
         ORDER BY id ASC
         LIMIT 1`
    );

    return results.length ? results[0] : null;
}

// ─── Aufgabe einem Worker zuweisen ─────────────────────────────────────────
// Trägt die Worker-ID in die Aufgabe ein und setzt den Status auf
// 'zugewiesen'. Es werden nur Aufgaben geändert, die noch 'wartend' sind.
async function assignTaskToWorker(taskId, workerId) {
    await query(
        `UPDATE aufgabe
         SET worker_id = ?, status = 'zugewiesen'
         WHERE id = ?
         AND status = 'wartend'`,
        [workerId, taskId]
    );
}

// ─── Inaktive Worker erkennen und markieren ────────────────────────────────
// Setzt Worker auf 'inaktiv', wenn deren letzter Heartbeat älter als
// 60 Sekunden ist. So kann der Controller ausgefallene Worker erkennen.
async function markInactiveWorkers() {
    await query(
        `UPDATE worker
         SET status = 'inaktiv'
         WHERE status = 'aktiv'
         AND letzter_heartbeat < DATE_SUB(NOW(), INTERVAL 60 SECOND)`
    );
}

// ─── Aufgaben von inaktiven Workern wieder freigeben ───────────────────────
// Setzt Aufgaben zurück auf 'wartend', wenn sie einem inaktiven Worker
// zugewiesen waren oder gerade von ihm bearbeitet wurden.
async function releaseTasksFromInactiveWorkers() {
    await query(
        `UPDATE aufgabe
         SET worker_id = NULL, status = 'wartend'
         WHERE worker_id IN (
             SELECT id
             FROM worker
             WHERE status = 'inaktiv'
         )
         AND status IN ('zugewiesen', 'in_bearbeitung')`
    );
}

// ─── Hauptschleife des Controllers ─────────────────────────────────────────
// Prüft regelmäßig auf inaktive Worker, gibt deren Aufgaben frei und
// verteilt wartende Aufgaben an freie aktive Worker.
async function controllerLoop() {
    console.log("Controller-Loop gestartet. Prüfe alle 5 Sekunden auf freie Worker und wartende Aufgaben...");

    while (true) {
        try {
            await markInactiveWorkers();
            await releaseTasksFromInactiveWorkers();

            let task = await getWaitingTask();
            let worker = await getFreeWorker();

            while (task && worker) {
                await assignTaskToWorker(task.id, worker.id);
                console.log(`Aufgabe ${task.id} wurde Worker ${worker.id} zugewiesen`);

                task = await getWaitingTask();
                worker = await getFreeWorker();
            }
        } catch (error) {
            console.error("Fehler im Controller-Loop:", error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// ─── Controller-Prozess starten ────────────────────────────────────────────
// Startet die Hauptschleife des Controllers. Bei Fehlern wird nach kurzer
// Wartezeit automatisch ein neuer Versuch gestartet.
async function start() {
    let versuch = 0;

    while (true) {
        try {
            versuch++;
            console.log(`Verbindungsversuch ${versuch}...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            await controllerLoop();
        } catch (error) {
            console.error(`Versuch ${versuch} fehlgeschlagen: ${error.message}`);
            console.log("Warte 5 Sekunden und versuche erneut...");
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

start();