const express = require('express');
const HttpStatus = require('http-status');
const _ = require('lodash');
const { Parser } = require('json2csv');
const xmlparser = require('express-xml-bodyparser')
const { createLogger, stdSerializers } = require('bunyan');
const epcDecoder = require('./mconDecoder')
var http = require('http');
var fs = require("fs"); // Load the filesystem module

// for file size check ....but we need name of the file to read
// var stats = fs.statSync("myfile.txt")
// var fileSizeInBytes = stats.size;
// // Convert the file size to megabytes (optional)
// var fileSizeInMegabytes = fileSizeInBytes / (1024*1024);

const { PORT } = process.env
const port = PORT ? Number(PORT) : 8080;

const options = (name) => ({
  name,
  level: 'debug',
  src: true,
  serializers: stdSerializers,
});

const logger = createLogger(options('mcon'));

let connected = undefined;
let isMconConnected = undefined;
let isMconOnline = false;

class MCONOptions {

  onScanned(data) {
    const { items, event = 'MCON_SCANNED' } = data || {};
    if (!items) {
      logger.warn('Invalid EPC Scan Data:', data);
      return;
    }
  }

  onConnected() {
    if (connected !== true) {
      connected = true;
      logger.info('MCON Reader Connected');
    }
    isMconOnline = true;
  }

  onDisconnected() {
    if (connected !== false) {
      connected = false;
      logger.info('MCON Reader Disconnected');
    }
    isMconOnline = false;
  }

  onError(error) {
    logger.error(error.toString());
    logger.info('MOCN reader Invalid response')
  }
}


class MconHttpServer {
  constructor({ logger, port, ip }) {
    this.logger = logger || {
      info: console.log,
      error: console.log,
    };
    this.options = new MCONOptions();
    this.port = port
    this.ip = ip
    //this.ip = ip
    this.app = express();
    this.app.use(express.json());
    this.app.use(xmlparser())
    this.app.post('/tagsData', (req, res) => this.readEpcData(req, res));
    this.app.post('/heartBeat', (req, res) => this.readHeartBeat(req, res));
  }

  hanndleHeartBeatEvent(jsonObject) {
    let mconResponse = {}
    try {
      logger.info('Handle heartBeat event!!')
      const specName = jsonObject['ale:ecreports']['$']['specName']
      mconResponse['specName'] = specName
      return mconResponse
    } catch (error) {
      this.options.onError(error)
    }
  }

  readHeartBeat(req, res){
    try {
      if (_.isEmpty(req.body)) {
        res.sendStatus(HttpStatus.NO_CONTENT)
      }
      else {
        // heartBeat response
        if (req.body.hasOwnProperty('ale:ecreports')) {
          let mconData = this.hanndleHeartBeatEvent(req.body)
          if (mconData.specName === 'heartbeat_template_1') {
            this.options.onConnected()
            isMconConnected = true
          } else {
            this.options.onError("Invalid mcon response")
          }
          res.sendStatus(HttpStatus.OK)
        }
        else {
          res.sendStatus(HttpStatus.BAD_REQUEST)
        }
      }

    } catch (e) {
      this.logger.error(`MconHttpServer.readMCONResponse ERROR: ${e.message}`);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(e);
    }

  }
  readEpcData(req, res){
      if (_.isEmpty(req.body)) {
        res.sendStatus(HttpStatus.NO_CONTENT)
      }
      else {
        // Dock Door tags read response
        if (req.body.hasOwnProperty('ale:ecreports')) {
          
          if (isMconOnline) {
            let data = this.hanndleDockDoorEvent(req.body);
            var today = new Date();
            var fileName = today.getDate() + '-' + (today.getMonth() + 1) + '-' +today.getFullYear()+'_'+today.getHours() + '-' + today.getMinutes() + '-' + today.getSeconds();
            var fields = ['rawEpcId','epc','lpn','itemNumber','companyPrefix','specification','reportName','logicalReader','direction','timeStamp'];
            const csv = new Parser({fields});
            console.log("Yeaf------------------");
            fs.writeFile(`${fileName}.csv`, csv.parse(data.items), function(err){
              if(err){
                console.log(err);
              }
              console.log('file saved');
            })
          }
          else {
            res.sendStatus(HttpStatus.OK)
          }
        }        
      }
  };
  hanndleDockDoorEvent(jsonObject) {
    let mconResponse = {}
    let epcTags = []
    let logicalReader = []
    let finalData = {}

    logger.info('Handle dockDoor response!!')
    const specName = jsonObject['ale:ecreports']['$']['specName']
    const creationDate = jsonObject['ale:ecreports']['$']['creationDate']
    const numberOfTags = jsonObject['ale:ecreports']['reports'][0]['report'][0]['group'][0]['groupcount'][0]['count'][0]
    const reportName = jsonObject['ale:ecreports']['reports'][0]['report'][0]['$']['reportName']

    // extracting epc tags info
    for (let tag = 0; tag < numberOfTags; tag++) {
      epcTags.push(jsonObject['ale:ecreports']['reports'][0]['report'][0]['group'][0]['grouplist'][0]['member'][tag]['rawhex'][0])
      logicalReader.push(jsonObject['ale:ecreports']['reports'][0]['report'][0]['group'][0]['grouplist'][0]['member'][tag]['$'])
    }

    mconResponse['reportName'] = reportName
    mconResponse['specName'] = specName
    mconResponse['creationDate'] = creationDate
    mconResponse['epc'] = epcTags
    mconResponse['logicalReader'] = logicalReader

    const obj = new epcDecoder.MconDataDecoder()
    let items = []
    for (let index = 0; index < epcTags.length; index++) {
      items.push({
        'rawEpcId': epcTags[index],
        'epc': obj.decodeEpc(epcTags[index])['epc'],
        'lpn': obj.decodeEpc(epcTags[index])['lpnNumber'],
        'itemNumber': obj.decodeEpc(epcTags[index])['itemNumber'],
        'companyPrefix': obj.decodeEpc(epcTags[index])['prefix'],
        'specification': specName,
        'reportName': reportName,
        'logicalReader': logicalReader[index]['ale_mojix_ext:logicalReader'],
        'direction': logicalReader[index]['ale_mojix_ext:direction'],
        'timeStamp': logicalReader[index]['ale_mojix_ext:ts'],
      })
    }
    finalData['items'] = items
    console.log(finalData);
    return finalData
  }


  start() {
    // logic to start mcon Server
    this.instance = this.app.listen(this.port, this.ip, () => { });
    this.logger.info(`Mcon listner running on port ${this.ip}:${this.port}`);
  }

  shutdown(){
    this.logger.info(`Mcon listner shutting down`);
    this.instance.close();
  }

  checkMconConnectivity() {
    let mconOption = new MCONOptions()
    setInterval(function () {
      if (!isMconConnected) { // wait 3 more sec, to get heart beats
        setTimeout(function () {
          if (!isMconConnected) {
            logger.info('MCON is offline, No heart beat is receiving', "isMconConnected ", isMconConnected)
            mconOption.onDisconnected()
          }
        }, 3 * 1000)

      } else {
        logger.info('MCON is online, health status is O.K')
        mconOption.onConnected()
        isMconConnected = false
      }
    }, 12 * 1000)
  }
}

module.exports = MconHttpServer;
