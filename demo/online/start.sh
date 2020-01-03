#!/usr/bin/env bash
########################################################################
#    File Name: start.sh
# 
#       Author: Taomee Shanghai,Inc.
#         Mail: aceway@taomee.com
# Created Time: Mon 10 Dec 2018 03:18:05 AM EST
#  Description: ...
# 
########################################################################
RED="\033[0;31m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[0;33m"
GRAY="\033[0;37m"
LIGHT_RED="\033[1;31m"
LIGHT_YELLOW="\033[1;33m"
LIGHT_GREEN="\033[1;32m"
LIGHT_BLUE="\033[0;34m"
LIGHT_GRAY="\033[1;37m"
END="\033[0;00m"

dt=`date +"%Y %m %d %H %M %S"`
array=($dt)
year=${array[0]}
month=${array[1]}
day=${array[2]}
hour=${array[3]}
minute=${array[4]}
second=${array[5]}

cd `dirname "$0"`
path=`pwd`
log_path="${path}/logs"
if [ -d "${log_path}" ];then
    :
else
    mkdir -p "${log_path}"
fi

project_name=`cat ./app.json | grep project_name | awk -F\" '{print $4}'`
#server_name=`cat ./app.json | grep server_name | awk -F\" '{print $4}'`
server_name=`basename ${PWD}`
process_file="${project_name}_${server_name}.js"

if [ $# -eq 0 ];then
    forever_log="${log_path}/${server_name}-$(date +%Y-%m%d-%H).log"
    #forever_log="/dev/null"
else
    forever_log="/dev/null"
fi


bash ./server_ctrl.sh start ${process_file} $forever_log
