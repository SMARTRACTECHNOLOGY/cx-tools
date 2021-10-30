/**
 * MCON EPC Constructs :
00001100 001 101 000000010001001001010111 00011101111011110101 00000000000010011011100011000010000101
48        1   5  70231                    122613               40775813  
Header    F   P  Prefix                   Item No.             LPN 
8b        3b  3b 24b                      20b                  38b  
 */

const { createLogger } = require('bunyan');
const options = (name = 'mcon') => ({
    name,
    level: 'debug',
    src: true,
    serializers: stdSerializers,
  });

const logger = createLogger(options);

class MconDataDecoder {
    constructor() {
      this.epcUriPrefix = "urn:epc:raw:96.x";
      this.invalidHexPattern = /([a-z])|([G-Z])|([!@#\$%\^\&*\)\(+=._-])+/g
      this.epcUriPrefixPattern = /urn:epc:raw:96.x/
      this.hex2bin = this.hex2bin
      this.decodeEpc = this.decodeEpc
      this.hexToBinArray = this.hexToBinArray
      this.epcConstructs = this.epcConstructs
      
  }
  
  decodeEpc(epcUriString) {
   
      /** Validations */
  
      // case 1 : If no epc data received
      if (epcUriString.length === 0) {
          return false
      }
      // case 2: If any epc tag have invalid epc uri
      if (! (this.epcUriPrefixPattern).test(epcUriString) ) {
        logger.info(`Invalid epc uri ${epcUriString}`)
        return false
      }
      // case 3: check validation for should hex string lennght (12 bytes or 96 bits)
      if (epcUriString.split("urn:epc:raw:96.x")[1].length !== 24) {
          logger.info(`Invalid epc uri ${epcUriString}`)
          return false
      }
      // case 4: check validation for hex string pattern
      if (this.invalidHexPattern.test(epcUriString.split("urn:epc:raw:96.x")[1])) {
        logger.info(`Invalid hex string ${epcUriString}`)
        return false
      }
      
      // if (epcUriString.split("urn:epc:raw:96.x")[1].match(/.{2}/g)[0] === 'BC') {
      //     return {
      //         "RP" : epcUriString.split("urn:epc:raw:96.x")[1] 
      //     };
      // } else {
      //     return this.epcConstructs(this.hexToBinArray(epcUriString));
      // }
      return this.epcConstructs(this.hexToBinArray(epcUriString));
  }
  
  // Helper method 1
  hex2bin(hex) {
      var bin = parseInt(hex, 16).toString(2);
      return ('0'.repeat(8 - bin.length) + bin);
  }
  
  // Helper method 2
  hexToBinArray(epc) {
      //var binArray = []
      var convertedToBin = {} // epc : binary string
      let hexBytes = epc.split(this.epcUriPrefix)[1].match(/.{2}/g); // actually split hex value from uri string
      let binString = undefined;
      hexBytes.forEach(twohexBytes => {
          binString += this.hex2bin(twohexBytes)
      });
      convertedToBin[epc.split(this.epcUriPrefix)] = binString.split("undefined")[1]
      return convertedToBin;
  }
  
    // Helper method 3
    epcConstructs(binData) {
       var decodedData = {}
       const epcValue = Object.entries(binData)[0][0].split(",")[1]
       console.log(epcValue,"epcValue");
       const epcBinString = Object.entries(binData)[0][1]
       console.log(epcBinString,"epcBinString");
       // check if rp 
       if(epcValue.substring(0,2) === 'BC'){
        decodedData['rp'] = `${this.epcUriPrefix}${epcValue}`
        decodedData['rawEpcId'] = `${this.epcUriPrefix}${epcValue}`
        decodedData['epc'] = epcValue
        decodedData['prefix'] = '000'
        decodedData['itemNumber'] = '0000'
        decodedData['lpnNumber'] = '000000'
        return decodedData  
       } 
      
       decodedData['rawEpcId'] = `${this.epcUriPrefix}${epcValue}`
       decodedData['epc'] = epcValue;
       decodedData['prefix'] = parseInt(epcBinString.substring(14, 34), 2).toString(10)
       decodedData['prefix'] = this.lengthCheck(decodedData['prefix'],6);
       decodedData['itemNumber'] = parseInt(epcBinString.substring(34, 58), 2).toString(10)
       decodedData['itemNumber'] = this.lengthCheck(decodedData['itemNumber'],7);
       decodedData['lpnNumber'] = parseInt(epcBinString.substring(58, 96), 2).toString(10)
       return decodedData;
     }
    // if length is less than 5 than this function will take care of the length
     lengthCheck( str, width) {
      var len = str.length;
      for(let i=1;i<=(width-len);i++){
        str = '0'+str;
      }
      return str;
    }
  }
  
  module.exports = {
    MconDataDecoder,
  };