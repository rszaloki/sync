var johnDb = new Dexie("John");
var janeDb = new Dexie("Jane");

var recordDef = { records: "id,version,currentDate",
                  commits: "version",
                  profiles: "profile",
                  changes: "version, type, table" };

johnDb.version(1).stores(recordDef);

johnDb.open();

janeDb.version(1).stores(recordDef);

janeDb.open();


