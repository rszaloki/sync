function GUID() {
  return (GUID.S4() + GUID.S4() + "-" + GUID.S4() + "-4" + GUID.S4().substr(0,3) + "-" + GUID.S4() + "-" + GUID.S4() + GUID.S4() + GUID.S4()).toLowerCase();
}

GUID.S4 = function(){
  return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

