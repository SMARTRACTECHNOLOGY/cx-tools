const mcodDecoder = require('./epc-decoding');

var myEpcUri = 'urn:epc:raw:96.x303404495C77BA40026E3086';


let myTestObj = new mcodDecoder.MconDataDecoder();

console.log(myTestObj.decodeEpc(myEpcUri));


    
