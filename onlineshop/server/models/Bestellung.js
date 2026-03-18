class Bestellung {
    
    static orderIDcounter = 0;

    constructor(warenkorb){
        this.artikelID = "B" + (++oderIDCounter); //1.Bestellung hat ID: B1, 2.Bestellung hat ID: B2 usw.
        this.warenkorb = warenkorb;
        //this.lieferAdr  hier irgendwie die Adresse greifen von dem User der grade angemeldet ist.
        this.gesPreis =  warenkorb.calculatePrice();
        //this.zahlMeth = 
        this.createdAt = new Date(); //Date Objekt hat das Format JJJJ-MM-TTHH:mm:ss.sssZ
        //this.changedAt = 
    }

    get artikelID(){
        return this.artikelID;
    }

    get Warenkorb(){
        return this.warenkorb;
    }

    get lieferAdr(){
        return this.lieferAdr;
    }

    get gesPreis(){
        return this.gesPreis;
    }

    get zahlMeth(){
        return this.zahlMeth;
    }

    get createdAt(){
        return this.createdAt;
    }

}