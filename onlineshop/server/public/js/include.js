/*
  Diese Datei lädt wiederverwendbare HTML-Komponenten
  wie Header und Footer automatisch in die Seite ein.
*/

document.addEventListener("DOMContentLoaded", () => {
  loadComponent("header-placeholder", "components/header.html");
  loadComponent("footer-placeholder", "components/footer.html");
});

/*
  Funktion zum Laden einer externen HTML-Datei
  und Einfügen in ein bestimmtes Element.
*/
function loadComponent(placeholderId, filePath) {
  const placeholder = document.getElementById(placeholderId);

  if (!placeholder) {
    console.error(`Platzhalter mit ID "${placeholderId}" wurde nicht gefunden.`);
    return;
  }

  fetch(filePath)
    .then(response => {
      if (!response.ok) {
        throw new Error(`Datei konnte nicht geladen werden: ${filePath}`);
      }
      return response.text();
    })
    .then(data => {
      placeholder.innerHTML = data;
    })
    .catch(error => {
      console.error("Fehler beim Laden der Komponente:", error);
    });
}