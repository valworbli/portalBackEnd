#!/bin/bash

MYNAME=$(basename $0)
let MYLENGTH=${#0}-${#MYNAME}
ZERO=0
MYPWD=${0:ZERO:MYLENGTH}

cd $MYPWD/../SlackNotify
zip -r ../slacknotify.zip *
aws lambda update-function-code --function-name SlackNotify --zip-file fileb://../slacknotify.zip
rm -f ../slacknotify.zip
