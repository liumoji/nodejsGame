#!/usr/bin/env bash
cd `dirname $0`
PROJECT="demo"
term_info=${TERM:-"dumb"}

if [ -z ${term_info} ] || [ "${term_info}" = "dumb" ];then
    RED=""
    GREEN=""
    BLUE=""
    YELLOW=""
    GRAY=""
    LIGHT_RED=""
    LIGHT_YELLOW=""
    LIGHT_GREEN=""
    LIGHT_BLUE=""
    LIGHT_GRAY=""
    END=""
else
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
fi

function stat()
{
    local pfile=$1

    local path=`pwd`
    local nowdir=`basename ${path}`
    
    local ppath=`dirname ${path}`
    local pdir=`basename ${path}`

    #echo $path
    #echo $pfile
    #echo $pdir

    echo -e "${GREEN} ${pfile} stating...${END}"
    #local pcount=`ps -ef | grep -w ${LOGNAME} | grep "\<${pfile}\>" |grep "\<node\>"|grep -w "\<${pdir}\>"|grep -v "grep"|wc -l`
    local pcount=`ps -ef | grep -w ${LOGNAME} | grep "${path}" |grep -w "\<${pfile}\>"|grep -v "\<stat\>"|grep -v "grep"|wc -l`
    echo -e "${YELLOW}[${pfile}]${END} - ${GREEN} 进程数: ${LIGHT_RED}${pcount}${END}"
    if [ `expr ${pcount}` -gt 0 ]; then
        ps -ef | grep -w ${LOGNAME} | grep "${path}" |grep -w "\<${pfile}\>"|grep -v "\<stat\>"|grep -v "grep"
        echo
        #if [ -f ./node_modules/forever/bin/forever ];then
        #    node ./node_modules/forever/bin/forever list
        #else
        #    forever list
        #fi
    else
        echo -e ${YELLOW}"\t你还没有在运行中的${pfile}"${END}
    fi
}

function start() 
{
    local pfile=$1
    local logfile=$2

    local path=`pwd`
    local nowdir=`basename ${path}`
    
    local ppath=`dirname ${path}`
    local pdir=`basename ${path}`

    echo -e "${GREEN} ${pfile} starting...${END}"
    #local pcount=`ps -ef | grep -w ${LOGNAME} | grep "\<${pfile}\>" |grep "\<node\>"|grep -w "\<${pdir}\>"|grep -v "grep"|wc -l`
    local pcount=`ps -ef | grep -w ${LOGNAME} | grep "${path}" |grep -w "\<${pfile}\>"|grep -v "\<start\>" |grep -v "grep"|wc -l`
    if [ `expr ${pcount}` -gt 0 ]; then
        #echo ${pcount}
        #ps -ef | grep -w ${LOGNAME} | grep "${path}"|grep -w "\<${pfile}\>"|grep -v "\<start\>"|grep -v "grep"
        echo -e ${YELLOW}"当前 ${pfile} 在运行, 请检查!"${END}
    else
        if [ -f ./node_modules/forever/bin/forever ];then
            if [ -f ./bin/node ];then
                ./bin/node --max-old-space-size=4096  ./node_modules/forever/bin/forever start --killSignal=SIGTERM -l $logfile -a $pfile 
            else
                node --max-old-space-size=4096  ./node_modules/forever/bin/forever start --killSignal=SIGTERM -l $logfile -a $pfile 
            fi
        else
            if [ -f ./bin/node ];then
                forever start --killSignal=SIGTERM -l $logfile -a $pfile -c ./bin/node 
            else
                forever start --killSignal=SIGTERM -l $logfile -a $pfile -c node 
            fi
        fi
        local ret=$?
        if [ $ret -eq 0 ]; then
            echo -e ${GREEN}"\t已为你启动 ${pfile}..."${END}
        else
            echo -e ${RED}"\t为你启动${pfile}失败!"${END}
        fi
    fi
}

function stop()
{
    local pfile=$1

    local path=`pwd`
    local nowdir=`basename ${path}`
    
    local ppath=`dirname ${path}`
    local pdir=`basename ${path}`

    #echo $path
    #echo $pdir
    #echo $pfile

    echo -e "${GREEN} ${pfile} stoping...${END}"
    #local pcount=`ps -ef | grep -w ${LOGNAME} | grep "\<${pfile}\>" |grep "\<node\>"|grep -w "\<${pdir}\>"|grep -v "grep"|wc -l`
    local pcount=`ps -ef | grep -w ${LOGNAME} | grep "${path}" |grep -w "\<${pfile}\>"|grep -v "\<stop\>"|grep -v "grep"|wc -l`
    if [ `expr ${pcount}` -gt 0 ]; then
        if [ -f ./node_modules/forever/bin/forever ];then
            if [ -f ./bin/node ];then
                ./bin/node ./node_modules/forever/bin/forever stop $pfile
            else
                node ./node_modules/forever/bin/forever stop $pfile
            fi
        else
            if [ -f ./bin/node ];then
                forever stop -c ./bin/node 
            else
                forever stop $pfile -c node 
            fi
        fi
        local ret=$?
        if [ $ret -eq 0 ]; then
            echo -e ${RED}"\tkilled your ${pfile}..."${END}
        else
            echo -e ${YELLOW}"\tkill your ${pfile}... FAILED."${END}
        fi
    else
        echo -e ${YELLOW}"\t当前 ${pfile} 还没有运行"${END}
    fi
}

function debug()
{
    local pfile=$1
    local whost=$2
    local wport=$3
    local brk=$4

    local path=`pwd`
    local nowdir=`basename ${path}`
    
    local ppath=`dirname ${path}`
    local pdir=`basename ${path}`

    stop ${pfile}
    echo

    #local pcount=`ps -ef | grep -w ${LOGNAME} | grep "\<${pfile}\>" |grep "\<node\>"|grep -w "\<${pdir}\>"|grep -v "grep"|wc -l`
    local pcount=`ps -ef | grep -w ${LOGNAME} | grep "\<${pfile}\>" |grep -w "\<${pdir}\>"|grep -v "\<debug\>"|grep -v "grep"|wc -l`
    if [ `expr ${pcount}` -eq 0 ]; then
        echo -e ${YELLOW}"\t1, 请在chrome浏览器地址输入: chrome://inspect/#devices"${END}
        echo -e ${YELLOW}"\t2, 首次使用的话点击 'Configure...' 按钮，弹出的对话框里, 如果没有则输入地址 ${whost}:${wport}, 点击 'done' 确认"${END}
        echo -e ${YELLOW}"\t2.1, 点击 'Open dedicated DevTools for Node' 链接, 打开新页面 "${END}
        echo -e ${YELLOW}"\t2.2, 使用Profiler, Console, Source, Memory工具, 通过WEB远程调试，分析服务内存，性能..."${END}

        echo -e ${YELLOW}"\t3, 后继使用时，启动服务端后，在页面的 'Remote Target #${whost}' 下方选择相应: 'inspect' 链接进入..."${END}
		if [ ${brk} = "brk" ]; then
        	local cmd="node --inspect-brk=${whost}:${wport} ${pfile}"
		else
        	local cmd="node --inspect=${whost}:${wport} ${pfile}"
		fi
        $cmd
        echo
    else
        echo -e ${YELLOW}"\t你还有 ${pfile} 在运行中, 不能启动调试"${END}
    fi
}

function help()
{
    local pfile=$1
    echo -e "Usage:\n\t${LIGHT_GREEN}program_ctrl ${YELLOW}start|stop|restart|stat${END}"
}

function restart()
{
    stop $@
    echo
    start $@
}

function clear_other_pfile()
{
    this_pfile="$1"
    for pf in `ls ${PROJECT}_*.js`
    do
        if [ "${pf}" = "${this_pfile}" ] && [ -L ${pf} ];then
            :
        else
            rm -f ${pf}
        fi
    done
}

function program_ctrl()
{
    if [ $# -lt 2 ];then
        echo -e "${RED}至少提供两个参数:program_ctrl cmd pfile [logfile]!${END}"
        return
    fi

    local cmd=$1
    local pfile=$2

    clear_other_pfile $pfile

    if [ -f ./${pfile} ];then
        :
    else
        if [ -f ./app.js ];then
            ln -s ./app.js ${pfile}
        else
            echo -e "${RED}当前目录[$(pwd)]下缺少:app.js!${END}"
            return
        fi
    fi
    shift
    if [ "${cmd}" = "stop" ] ; then
        stop $@
    elif [ "${cmd}" = "start" ]; then
        start $@
    elif [ "${cmd}" = "stat" ]; then
        stat $@
    elif [ "${cmd}" = "restart" ]; then
        restart $@
    elif [ "${cmd}" = "debug" ]; then
        debug $@
    elif [ "${cmd}" = "--help" ] || [ "$cmd" = "-h" ]; then
        help
    else
        help
    fi
}

program_ctrl $@
