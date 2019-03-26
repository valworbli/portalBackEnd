#!/bin/bash

# Get the path (absolute/relative) to the script
MYNAME=$(basename $0)
let MYLENGTH=${#0}-${#MYNAME}
ZERO=0
MYPWD=${0:ZERO:MYLENGTH}

cd $MYPWD/..

systemctl restart docker
# for dock in $(docker ps | awk '{print $1}' | grep -v CONTAINER); do docker stop $dock; done
# ./docker-dev.sh -d
# bash -l -c '/home/ubuntu/portal/portalBackEnd/docker-dev.sh'
