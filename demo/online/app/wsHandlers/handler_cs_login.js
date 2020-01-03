/*
 *************************************************************************
 *    File Name:  handler_cs_login.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Tue 28 Aug 2018 06:38:25 AM EDT
 * 
 *  Description: ...
 * 
 ************************************************************************
*/
module.exports = (net, msg)=>{
  console.info('got msg in handler_cs_login.js ok: ', msg);
  if (msg.bd) msg.bd.ext = "yeah, I got you messsage, from server.";
  else msg.ext = "yeah, I got you messsage, by server.";
  net.tmSendData(msg);

  // TODO：先通过账号系统检验用户是否合法(密码校验 or session校验)...

  // 检验是否已经在本服在线,在则将之前的踢下线
  const tmApp = global.tmApp;
  if (tmApp.redisCenter.isUserOnline()){
  };

  // 检验是否已经在其它服在线,在则踢下线
  
};
