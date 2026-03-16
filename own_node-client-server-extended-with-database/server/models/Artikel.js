class Artikel {
    
    static artikelIDcounter = 0;

    constructor(kategorieID, bezeichnung, beschreibung, preis){
        this.artikelID = "A" + (++artikelIDCounter); //1.Artikel hat ID: A1, 2.Artikel hat ID: A2 usw.
        
        const erlaubteKat = [K1,K2,K3];
        if(!erlaubteKat.includes(kategorieID)){
            throw new ("Die KategorieID existiert nicht")
        }
        this.kategorieID = kategorieID;

        this.bezeichnung = bezeichnung;
        this.beschreibung = beschreibung;
        this.preis = preis;
        this.createdAt = new Date(); 
        //this.changedAt = ;

    }

    getWarenkorb(){
        return this.warenkorb;
    }

}