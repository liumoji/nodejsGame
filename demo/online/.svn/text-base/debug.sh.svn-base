#!/usr/bin/env bash
cd `dirname "$0"`

project_name=`cat ./app.json | grep project_name | awk -F\" '{print $4}'`
#server_name=`cat ./app.json | grep server_name | awk -F\" '{print $4}'`
server_name=`basename ${PWD}`
process_file="${project_name}_${server_name}.js"

if [ $# -gt 1 ];then
    port=$1
    brk=$2
else
    if [ $# -gt 0 ];then
        port=$1
        brk="brk"
    else
        port=2019
        brk="brk"
    fi
fi

host=`/sbin/ifconfig eth0|grep -w 'inet'|grep  -v '127.0.0.1'|tail -1|awk '{print $2}'|cut -d":" -f2`

bash ./server_ctrl.sh debug ${process_file} ${host} ${port} ${brk}
