

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



function Profile(db) {

  this.db = db;

  this.id = GUID();
  this.clock = new Clock();
  this.version = "";
  if( !db.commits ) {
    throw new Error("missing commits table!");
  }
}

Profile.prototype.load = function() {

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

Profile.prototype.addHooks = function( tables ) {
  var profile = this;
  tables.forEach((function(table){
    profile.db[table].hook("creating", (function(pK, obj, transaction) {
      obj.version = this.version;
      return GUID();
    }).bind(profile));
    profile.db[table].hook("updating", (function(modifications, pK, obj, transaction) {
      return {
        version:this.version
      };
    }).bind(profile));
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


var john = new Profile(johnDb,["records"]);
john.load().then( function(val) {
  var db = john.db;
  console.log(val);
  john.addHooks(["records"]);

  db.records.add({ currentDate:1, amount:10 })
    .then(john.commit.bind(john))
    .then(function(){
      return db.transaction("rw",db.records,function(){
        db.records.add({ currentDate:2, amount:20 });
        db.records.add({ currentDate:3, amount:30 });
      });
    })
    .then(john.commit.bind(john));
});


/*
var jane = new Profile(janeDb.records);

jane.sync(johnId);

janeDb.records.add({ currentDate:1, amount:-10 });
janeDb.records.add({ currentDate:3, amount:20 });
janeDb.records.add({ currentDate:5, amount:-5 });
*/

