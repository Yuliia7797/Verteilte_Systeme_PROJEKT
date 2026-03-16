class Adresse{

    //die Adresse muss auch aus den Infos die aus dem Frontend kommen gegriffen werden

    constructor(strasse, hausNr, plz, ort, adressZusatz){
        //this.strasse = ;
        //this.hausNr = ;
        //this.plz = ;
        //this.ort = ;
        //this.adressZusatz = ;
    }

    get strasse(){
        return this.strasse;
    }

    get hausNr(){
        return this.hausNr;
    }

    get plz(){
        return this.plz;
    }

    get ort(){
        return this.ort;
    }

    get adressZusatz(){
        return this.adressZusatz;
    }
}