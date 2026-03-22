//___________KUNDENKONTO FUNKTIONEN_______________

//___________KUNDENKONTO FUNKTIONEN_______________


//___________PRODUKTKATALOG FUNKTIONEN____________

//___________PRODUKTKATALOG FUNKTIONEN____________


//___________WARENKORB FUNKTIONEN_________________

// ─── Neuen Warenkorb erstellen ─────────────────────────────────────────────
// Erstellt einen neuen Warenkorb für einen Benutzer und speichert den
// aktuellen Zeitpunkt. Gibt die automatisch generierte Warenkorb-ID zurück.
async function newBasket(benutzer_Id) {
    const result = await query(
        `INSERT INTO warenkorb (benutzer_id, erstellungszeitpunkt)
         VALUES (?, NOW())`,
        [benutzer_Id]
    );

    return result.insertId;
}

// ─── Produkt zum Warenkorb hinzufügen ──────────────────────────────────────
// Holt den Preis des Artikels aus der Datenbank, berechnet den Gesamtpreis
// anhand der Anzahl und fügt den Artikel in den Warenkorb ein.
async function addProductToBasket(warenkorb_id, artikel_id, anzahl) {
    
    const artikel = await query(
        `SELECT preis
         FROM artikel
         WHERE artikel.id = ?`
         [artikel_id]
    );

    const einzelpreis = artikel[0].preis;

    const gesamtpreis = einzelpreis * anzahl;

    await query(
        `INSERT INTO warenkorb_position (warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis, erstellungszeitpunkt)
         VALUES (?, ?, ?, ?, ?, NOW())`,
         [warenkorb_id, artikel_id, anzahl, einzelpreis, gesamtpreis]
    )

}

// ─── Produktanzahl im Warenkorb ändern ─────────────────────────────────────
// Aktualisiert die Menge eines bestimmten Artikels innerhalb eines
// bestimmten Warenkorbs.
async function changeProductAmount(warenkorb_id, artikel_id, anzahl) {
    await query(
        `UPDATE warenkorb_position
         SET anzahl = ?
         WHERE warenkorb_id = ?
         AND artikel_id = ?`,
        [anzahl, warenkorb_id, artikel_id]
    );
}

// ─── Produkt aus dem Warenkorb entfernen ───────────────────────────────────
// Löscht einen bestimmten Artikel aus einem bestimmten Warenkorb.
async function deleteProduct(warenkorb_id, artikel_id) {
    await query(
        `DELETE FROM warenkorb_position
         WHERE warenkorb_id = ?
         AND artikel_id = ?`,
         [warenkorb_id, artikel_id]
    ) ;  
}

// ─── Alle Produkte eines Warenkorbs anzeigen ───────────────────────────────
// Holt alle Einträge eines Warenkorbs aus der Datenbank.
async function showProducts(warenkorb_id) {
    await query(
        `SELECT *
         FROM warenkorb_position
         WHERE warenkorb_id = ?`,
         [warenkorb_id]
    );
}

// ─── Gesamtpreis des Warenkorbs berechnen und speichern ────────────────────
// Berechnet den Gesamtpreis aller Positionen im Warenkorb und speichert
// das Ergebnis im Warenkorb selbst.
async function calculateTotal(warenkorb_id) {

    //Gesamtpreis berechnen
    const result = await query(
        `SELECT SUM(gesamtpreis) AS total
         FROM warenkorb_position
         WHERE warenkorb_id = ?`,
        [warenkorb_id]
    );

    const total = result[0].total || 0;

    //Warenkorb aktualisieren
    await query(
        `UPDATE warenkorb
         SET gesamtpreis = ?
         WHERE id = ?`,
        [total, warenkorb_id]
    );
}
//___________WARENKORB FUNKTIONEN_________________


//___________BESTELLUNG FUNKTIONEN________________

//___________BESTELLUNG FUNKTIONEN________________


//___________ZAHLUNG FUNKTIONEN___________________

//___________ZAHLUNG FUNKTIONEN___________________


//___________LAGER FUNKTIONEN_____________________

//___________LAGER FUNKTIONEN_____________________


//___________VERSAND FUNKTIONEN___________________

//___________VERSAND FUNKTIONEN___________________


//___________KOMMUNIKATION FUNKTIONEN_____________

//___________KOMMUNIKATION FUNKTIONEN_____________


//___________RECHNUNGEN FUNKTIONEN________________

//___________RECHNUNGEN FUNKTIONEN________________


//___________ADMINISTRATION FUNKTIONEN____________

//___________ADMINISTRATION FUNKTIONEN____________