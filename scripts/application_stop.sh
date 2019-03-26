#/bin/bash

# for dock in $(docker ps | awk '{print $1}' | grep -v CONTAINER); do docker stop $dock; done
systemctl stop docker
