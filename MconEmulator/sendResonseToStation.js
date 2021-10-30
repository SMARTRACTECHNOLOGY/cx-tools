const axios = require('axios-no-proxy')
const stationIP = '192.168.1.11';
const urlHeartBeatResponse = `http://${stationIP}:8084/heartBeat`
const urlDockDoorResponse = `http://${stationIP}:8084/tagsData`
const fs = require('fs')

var count = 0;
function sendHeartBeat(){
  count = count + 1;
    let config = {headers: {'Content-Type': 'text/xml'}}
    fs.readFile('./original-xml/heartBeat.xml', function(err, data){
      if(err) throw err
        axios.post(urlHeartBeatResponse, data, config)
      .then((response) => {
        console.log(`${data}`);
        console.log(`--- response status for heartBeatResponse --- ${response.status} seq ${count}`);
      }, (error) => {
        console.log(error);
      });
    }) 
  }

function sendDockDoorEvent(){
  let config = {headers: {'Content-Type': 'text/xml'}}
  fs.readFile('./original-xml/dockDoor.xml', function(err, data){
    if(err) throw err
      axios.post(urlDockDoorResponse, data, config)
    .then((response) => {
      console.log(`${data}`);
      console.log(`--- response status for dockDoorEvent --- ${response.status}`);
    }, (error) => {
      console.log(error);
    });
  }) 
}

const SEND_HEART_BEAT = true;
const SEND_DOCK_DOOR = true;

const heartBeatTimeInterval = 10;
const dockDoorTimeInterval = 5;

if(SEND_HEART_BEAT){
  setInterval(async () => {
    await sendHeartBeat();
  }, heartBeatTimeInterval * 1000)
}

if(SEND_DOCK_DOOR){
setInterval(async () => {
    await sendDockDoorEvent();
}, dockDoorTimeInterval * 1000)
}




