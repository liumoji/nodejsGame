#!/usr/bin/env bash
cd `dirname "$0"`

project_name=`cat ./app.json | grep project_name | awk -F\" '{print $4}'`
#server_name=`cat ./app.json | grep server_name | awk -F\" '{print $4}'`
server_name=`basename ${PWD}`
process_file="${project_name}_${server_name}.js"

bash ./server_ctrl.sh stat ${process_file}
