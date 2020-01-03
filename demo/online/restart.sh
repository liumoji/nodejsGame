#!/usr/bin/env bash
########################################################################
#    File Name: restart.sh
# 
#       Author: Taomee Shanghai,Inc.
#         Mail: aceway@taomee.com
# Created Time: Mon 10 Dec 2018 03:22:11 AM EST
#  Description: ...
# 
########################################################################

#!/usr/bin/env bash
cd `dirname "$0"`

project_name=`cat ./app.json | grep project_name | awk -F\" '{print $4}'`
#server_name=`cat ./app.json | grep server_name | awk -F\" '{print $4}'`
server_name=`basename ${PWD}`
process_file="${project_name}_${server_name}.js"
path=`pwd`
log_path="${path}/logs"
if [ -d "${log_path}" ];then
    :
else
    mkdir -p "${log_path}"
fi
if [ $# -eq 0 ];then
    forever_log="${log_path}/${server_name}-$(date +%Y-%m%d-%H).log"
else
    forever_log="/dev/null"
fi

bash ./server_ctrl.sh stop ${process_file} $forever_log
sleep 3
bash ./server_ctrl.sh start ${process_file} $forever_log
