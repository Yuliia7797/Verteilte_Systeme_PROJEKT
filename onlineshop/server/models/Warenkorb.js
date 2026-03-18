class Warenkorb {
    
    static wkorbIDcounter = 0;

    constructor(){
        this.warenkorbID = "A" + (++wkorbIDCounter); //1.Warenkorb hat ID: W1, 2.Warenkorb hat ID: W2 usw.
        //this.userID = ;  hier irgendwie die userID greifen, von dem der grade angemeldet ist
        this.artikel = [];
        this.createdAt = new Date(); //Date Objekt hat das Format JJJJ-MM-TTHH:mm:ss.sssZ
    }

    get warenkorbID(){
        return warenkorbID;
    }

    get userID(){
        return userID;
    }

    get arikel(){
        return this.artikel;
    }

    get createdAt(){
        return ceatedAt;
    }

    //Berechnet den Gesamtpreis aller Produkte im Warenkorb
    berechneGesPreis() {
    let summe = 0;

    for (let produkt of this.produkte) {
        summe += produkt.preis;
    }

    return summe;
    }

    ArtikelHinzufuegen(){
        //Arikel die der Kunde im frontend hinzugefügt hat
    }

}