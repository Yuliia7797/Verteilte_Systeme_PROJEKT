class Kategorie{

    constructor(kategorieID, bezeichnung){
        this.kategorieID = kategorieID;
        this.bezeichnung = bezeichnung;
        this.createdAt = new Date();
        //this.changedAt = ;
    }

    get kategorieID(){
        return this.kategorieID;
    }

    get bezeichnung(){
        return this.bezeichnung;
    }

    get createdAt(){
        return this.createdAt;
    }

    get changedAt(){
        
    }
}