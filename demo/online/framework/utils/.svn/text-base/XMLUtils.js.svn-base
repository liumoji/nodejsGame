'use strict';
const XmlDocument = require("xmldoc").XmlDocument;
const util = require("util");

let xmlUtils = {};
xmlUtils.decodeSimpleJS2XML = function(dataStr) {
    if(dataStr.charAt(1) != "?")
        dataStr = "<?xml version='1.0' encoding='utf-8'?>" + dataStr;
    dataStr = dataStr.replace(/^\ufeff/i, "").replace(/^\ufffe/i, "");
    let doc = new XmlDocument(dataStr)
    let obj = {};
    for(let i in doc.children){
      let c = doc.children[i];
      if(c){
        obj[c.name] = c.val;
      }
    }
    return obj;
}

xmlUtils.encodeSimpleJS2XML = function(obj) {
    let xmlStr = "<xml>";
    for (let key in obj)
    {
        if (util.isNumber(key))
        {
            xmlStr += "<" + key + ">" + obj[key] + "</" + key + ">";

        }
        else
            xmlStr +="<" + key + "><![CDATA[" + obj[key] + "]]></" + key + ">";
    }
    xmlStr += "</xml>";
    return xmlStr;
}

module.exports = xmlUtils;
