//___________KUNDENKONTO FUNKTIONEN_______________

const { query } = require("./db");



//___________WARENKORB FUNKTIONEN_________________

// ─── Neuen Warenkorb erstellen ─────────────────
// Erstellt einen neuen Warenkorb für einen Benutzer und speichert den
// aktuellen Zeitpunkt. Gibt die automatisch generierte Warenkorb-ID zurück.
async function newBasket(benutzer_id) {
    const result = await query(
        `INSERT INTO warenkorb (benutzer_id, erstellungszeitpunkt)
         VALUES (?, NOW())`,
        [benutzer_id]
    );

    return result.insertId;
}

// ─── Produkt zum Warenkorb hinzufügen ───────────
// Holt den Preis des Artikels aus der Datenbank, berechnet den Gesamtpreis
// anhand der Anzahl und fügt den Artikel in den Warenkorb ein.
async function addProductToBasket(warenkorb_id, artikel_id, anzahl) {
    
    const artikel = await query(
        `SELECT preis
         FROM artikel
         WHERE artikel.id = ?`,
        [artikel_id] // ❗ fehlendes Komma gefixt
    );

    // Prüfen ob Artikel existiert
    if (!artikel || artikel.length === 0) {
        throw new Error('Artikel nicht gefunden');
    }

    const einzelpreis = Number(artikel[0].preis);

    const gesamtpreis = einzelpreis * anzahl;

    await query(
        `INSERT INTO warenkorb_position 
        (warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis, erstellungszeitpunkt)
         VALUES (?, ?, ?, ?, ?, NOW())`,
         [warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis]
    );
}

// ─── Produktanzahl im Warenkorb ändern ────────────
// Aktualisiert die Menge eines bestimmten Artikels innerhalb eines
// bestimmten Warenkorbs und berechnet den Gesamtpreis neu.
async function changeProductAmount(warenkorb_id, artikel_id, anzahl) {

    const artikel = await query(
        `SELECT preis
         FROM artikel
         WHERE artikel.id = ?`,
        [artikel_id]
    );

    if (!artikel || artikel.length === 0) {
        throw new Error('Artikel nicht gefunden');
    }

    const einzelpreis = Number(artikel[0].preis);
    const gesamtpreis = einzelpreis * anzahl;

    await query(
        `UPDATE warenkorb_position
         SET anzahl = ?, gesamtpreis = ?, aenderungszeitpunkt = NOW()
         WHERE warenkorb_id = ?
         AND artikel_id = ?`,
        [anzahl, gesamtpreis, warenkorb_id, artikel_id]
    );
}

// ─── Produkt aus dem Warenkorb entfernen ───────────────
// Löscht einen bestimmten Artikel aus einem bestimmten Warenkorb.
async function deleteProduct(warenkorb_id, artikel_id) {
    await query(
        `DELETE FROM warenkorb_position
         WHERE warenkorb_id = ?
         AND artikel_id = ?`,
         [warenkorb_id, artikel_id]
    );  
}

// ─── Alle Produkte eines Warenkorbs anzeigen ──────────
// Holt alle Einträge eines Warenkorbs aus der Datenbank und gibt sie zurück.
async function showProducts(warenkorb_id) {
    const result = await query(
        `SELECT *
         FROM warenkorb_position
         WHERE warenkorb_id = ?`,
         [warenkorb_id]
    );

    return result; 
}

// ─── Gesamtpreis des Warenkorbs berechnen und speichern ─────
// Berechnet den Gesamtpreis aller Positionen im Warenkorb und speichert
// das Ergebnis im Warenkorb selbst.
async function calculateTotal(warenkorb_id) {

    // Gesamtpreis berechnen
    const result = await query(
        `SELECT SUM(gesamtpreis) AS total
         FROM warenkorb_position
         WHERE warenkorb_id = ?`,
        [warenkorb_id]
    );

    const total = result[0].total || 0;

    // Warenkorb aktualisieren
    await query(
        `UPDATE warenkorb
         SET gesamtpreis = ?, aenderungszeitpunkt = NOW()
         WHERE id = ?`,
        [total, warenkorb_id]
    );

    return total;
}

//___________WARENKORB FUNKTIONEN_________________

//___________BESTELLUNG FUNKTIONEN________________

// ─── Neue Bestellung erstellen ─────────────────
// Erstellt eine neue Bestellung mit allen erforderlichen Informationen.
// Gibt die automatisch generierte Bestellungs-ID zurück.
/*async function generateOrder(benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode) {
    const result = await query(
        `INSERT INTO bestellung (benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode, zahlungsstatus, bestellstatus, erstellungszeitpunkt)
         VALUES (?, ?, ?, ?, 'ausstehend', 'offen', NOW())`,
        [benutzer_id, lieferadresse_id, gesamtpreis, zahlungsmethode]
    );
    
    return result.insertId;
}

async function setOrderStatus(bestellung_id, bestellstatus) {
    await query(
        `UPDATE bestellung
         SET bestellstatus = ?
         WHERE id = ?`,
        [bestellstatus, bestellung_id]
    );
}

async function setPaymentStatus(bestellung_id, zahlungsstatus) {
    await query(
        `UPDATE bestellung
         SET zahlungsstatus = ?
         WHERE id = ?`,
        [zahlungsstatus, bestellung_id]
    );
}*/

//___________BESTELLUNG FUNKTIONEN________________