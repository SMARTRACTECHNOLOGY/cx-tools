step 0: cd to mconResponseEmulator
step 1: run npm install --save
step 2: check machines local ip address of machine on which Station is running
    ifconfig
step 3: edit line 2 stationIp= '' with ip of stations machine
step 3: run node sendResponseToStation.js 