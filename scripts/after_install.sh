#!/bin/bash

MYNAME=$(basename $0)
let MYLENGTH=${#0}-${#MYNAME}
ZERO=0
MYPWD=${0:ZERO:MYLENGTH}

cd $MYPWD/..

for dock in $(docker ps | awk '{print $1}' | grep -v CONTAINER); do docker stop $dock; done
rm -fr node_modules
chown -R ubuntu. ./*
