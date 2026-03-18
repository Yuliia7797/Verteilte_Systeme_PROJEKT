class Benutzer{

    static userIDcounter = 0;

    //die Parameter müssen aus dem Frontend gegriffen werden

    constructor(vorname, nachname, email, passwort, rolle, adresse){
        //this.vorname = vormame;
        //this.nachname = vorname;

        //this.email = email;
        if(!email.includes("@")){
            throw new Error("Ungültige Email-Adresse");
        }

        //this.passwort = passwort;

        const rolleOk = ["admin", "user"]; 

        if (!rolleOk.includes(rolle)) {
        throw new Error("Ungültige Rolle"); //stellt sicher, dass man nur admin oder normaler user sein kann
        }

        if (rolle === "admin") {
            this.userID = "U" + (++userIDCounter) + "A"; //"A" am Ende der ID wenn jemand Admin ist
        } else {
            this.userID = "U" + (++userIDCounter); //1.User hat ID: U1, 2.Artikel hat ID: U2 usw.
        }

        //this.role = role;
        //this.adresse = adresse;
        this.createdAt = new Date();
        //this.changedAt = 
    }

    get userID(){
        return this.userID;
    }

    get vorname(){
        return this.vorname;
    }

    get nachname(){
        return this.nachname;
    }

    get email(){
        return this.email;
    }

    get passwort(){
        return this.passwort
    }

    get rolle(){
        return this.role;
    }

    get createdAt(){
        return this.createdAt;
    }
}