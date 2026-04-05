/*
  Datei: include.js
  Beschreibung: Diese Datei lädt wiederverwendbare HTML-Komponenten wie Header und Footer automatisch in die Seite ein.
  Hinweise: Siehe Funktionskommentare unten
  Autor: Anastasiia Mavrodi, Yuliia Shostak, Lea Seiler
  Erstellt: 05.04.2026
*/

document.addEventListener("DOMContentLoaded", async () => {
  // Header und Footer nacheinander laden
  await loadComponent("header-placeholder", "components/header.html");
  await loadComponent("footer-placeholder", "components/footer.html");

  // Ereignis auslösen, damit andere JavaScript-Dateien wissen,
  // dass Header und Footer vollständig eingefügt wurden
  document.dispatchEvent(new Event("includesLoaded"));
});

/*
  Funktion zum Laden einer externen HTML-Datei
  und Einfügen in ein bestimmtes Element.
*/
async function loadComponent(placeholderId, filePath) {
  const placeholder = document.getElementById(placeholderId);

  if (!placeholder) {
    console.error(`Platzhalter mit ID "${placeholderId}" wurde nicht gefunden.`);
    return;
  }

  try {
    const response = await fetch(filePath);

    if (!response.ok) {
      throw new Error(`Datei konnte nicht geladen werden: ${filePath}`);
    }

    const data = await response.text();
    placeholder.innerHTML = data;
  } catch (error) {
    console.error("Fehler beim Laden der Komponente:", error);
  }
}