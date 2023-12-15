**cd api && npm install
cd ../admin && npm install
cd ../scripts/./startFabric.sh**
In case docker-compose command not found
install the docker-compose v1 not v2 with 
**curl -SL https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose**
set the permission for docker-compose 
**cd .. & sudo chmod -R 777 secure-chat** 
if you are facing "After 5 attempts, peer0.org1 has failed to join channel 'mychannel' " , then set the env variable 
**export CORE_PEER_TLS_ENABLED=true**



