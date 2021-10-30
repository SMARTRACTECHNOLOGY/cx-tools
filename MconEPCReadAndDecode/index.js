/* eslint-disable */

const os = require('os');
const { createLogger, stdSerializers } = require('bunyan');
const MconHttpServer = require('./mconHttpServer');
const { read } = require('fs');
const { networkInterfaces } = require('os');
const nets = networkInterfaces();

const { PORT, MCON_SERVER_PORT } = process.env;

const options = () => ({
  name: 'mcon',
  level: 'debug',
  src: true,
  serializers: stdSerializers,
});

const logger = createLogger(options());

//const port = PORT ? Number(PORT) : 8080;
const mconServerPort = MCON_SERVER_PORT ? Number(MCON_SERVER_PORT) : 8084;

function getLocalIp() {
  let results = Object.create(null); // Or just '{}', an empty object
  let ip = null;
  for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
              if (!results[name]) {
                  results[name] = [];
              }
              ip = net.address;
            }
          }
        }
        return ip
      }

class MCON {
  constructor({ logger }) {

    if (os.platform() === 'linux') {
      this.mconServer = new MconHttpServer({ logger, port: mconServerPort, ip : getLocalIp() });
    }
  }
  start() {
    if (this.mconServer) {
      this.mconServer.start();
      this.mconServer.checkMconConnectivity();
    }
  }

  shutDown() {
    if (this.mconServer) {
      this.mconServer.shutdown();
    }
    logger.info('Exiting MCON service now');
    process.exit(1);
  }
}



const readerHandle = new MCON({ logger });
readerHandle.start();

