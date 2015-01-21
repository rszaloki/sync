

function Clock( obj ) {
  this.add( obj || {} );
}

Clock.prototype.add = function( otherClock ) {
  Object.keys( otherClock ).forEach( (function( key ) {
    if( this[key] === undefined || otherClock[key] > this[key] ) {
      this[key] = otherClock[key];
    }
  }).bind(this) );
};

Clock.prototype.increment = function( id ) {
  this[id] = this[id] ? this[id]+1 : 1;
};

Clock.allKeys = function (a, b){
  var last = null;
  return Object.keys(a)
    .concat(Object.keys(b))
    .sort()
    .filter(function(item) {
      // to make a set of sorted keys unique, just check that consecutive keys are different
      var isDuplicate = (item == last);
      last = item;
      return !isDuplicate;
    });
};

Clock.compare = function(a, b) {
  var isGreater = false,
      isLess = false;

  // allow this function to be called with objects that contain clocks, or the clocks themselves
  if(a.clock) a = a.clock;
  if(b.clock) b = b.clock;

  Clock.allKeys(a, b).forEach(function(key) {
    var diff = (a[key] || 0) - (b[key] || 0);
    if(diff > 0) isGreater = true;
    if(diff < 0) isLess = true;
  });

  if(isGreater && isLess) return 0;
  if(isLess) return -1;
  if(isGreater) return 1;
  return 0; // neither is set, so equal
};



function Profile(db, tables) {

  this.tables = tables;
  this.db = db;

  this.id = GUID();
  this.clock = new Clock();
  this.version = "";
  if( !db.commits ) {
    throw new Error("missing commits table!");
  }
}

Profile.prototype.init = function() {

  this.addHooks();

  return this.db.profiles.get("me").then( (function( profile ) {
  var db = this.db;
    if(profile) {
      this.id = profile.id;
      this.clock = new Clock(profile.clock);
      this.version = profile.version;
      return this;
    } else {
      return this.commit();
    }
  }).bind(this) );
};

Profile.prototype.addHooks = function() {
  var profile = this;
  this.tables.forEach((function(table){
    profile.db[table].hook("creating", (function(currentTable, pK, obj, transaction) {
      var pKey = pK || GUID();
      obj.version = this.version;
      profile.db.changes.add({ version:this.version, type:"create", table:currentTable, objectId:pKey });
      return pKey;
    }).bind(profile, table));
    profile.db[table].hook("updating", (function(currentTable, modifications, pK, obj, transaction) {
      //transaction.table("changes").add({ version:this.version, type:"update", table:currentTable, objectId:pKey });
      return {
        version:this.version
      };
    }).bind(profile, table));
    profile.db[table].hook("deleting", (function(currentTable, pK, obj, transaction) {
      //transaction.table("changes").add({ version:this.version, type:"delete", table:currentTable, objectId:pK });
    }).bind(profile, table));
  }));
};


Profile.prototype.serialize = function() {
  return {
    profile:"me",
    id: this.id,
    clock: this.clock,
    version: this.version
  };
};

Profile.prototype.incrementVersion = function(){
  this.clock.increment(this.id);
  this.version = md5(JSON.stringify(this.clock));
};

Profile.prototype.commit = function() {
  return this.db.transaction("rw", this.db.commits, this.db.profiles, (function() {
    var db = this.db;

    this.incrementVersion();
    db.commits.add({ version:this.version, clock:this.clock });
    db.profiles.put( this.serialize() );
    return this;

  }).bind(this));
};

Profile.prototype.getChangedRecords = function( clock ) {
  var db = this.db;
  return false;
  function f(item){

  }

  return db.commits.toArray(function(commits) {
    commits.sort(Clock.compare);
  });
};


var john = new Profile(johnDb,["records"]);
var jane = new Profile(janeDb,["records"]);

Promise.all([
  johnDb.records.clear(),
  johnDb.profiles.clear(),
  johnDb.commits.clear(),
  johnDb.changes.clear(),
  janeDb.records.clear(),
  janeDb.profiles.clear(),
  janeDb.commits.clear(),
  janeDb.changes.clear(),
  john.init().then( function( john ) {
    var db = john.db;
    console.log( "john initialized" );

    return db.records.add({ currentDate:1, amount:10 })
      .then(john.commit.bind(john))
      .then(function(){
        return db.transaction("rw",db.records,function(){
          db.records.add({ currentDate:2, amount:20 });
          db.records.add({ currentDate:3, amount:30 });
        });
      });
  }),
  jane.init()
]).then(function(){
    console.log("end");
//  john.getChangedRecords(jane.clock);
}).catch(function(v){
  console.log(v);
});



