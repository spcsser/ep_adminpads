var eejs = require('ep_etherpad-lite/node/eejs')
  , padManager = require('ep_etherpad-lite/node/db/PadManager')
;
RegExp.quote = require('regexp-quote')
var isNumeric=function(arg){
  return typeof(arg)=="number";
};

var pads={
  pads:[] ,
  search: function(query, callback){
    
    var pads=padManager.getPads()
      , data={
        progress : 1
        , message: "Search done."
        , query: query
        , total: Math.ceil(pads.length/12)
      }
      , maxResult=0
      , result=[]
    ;
    if(query["pattern"] != null && query["pattern"] != ''){
      var pattern=query.pattern+"*";
      pattern=RegExp.quote(pattern);
      pattern=pattern.replace(/(\\\*)+/g,'.*');
      pattern="^"+pattern+"$";
      var regex=new RegExp(pattern,"i");
      pads.forEach(function(padID){
        if(regex.test(padID)){
          result.push(padID);
        }
      });
    }else{
      result=pads;
    }
    
    maxResult=result.length-1;
    if(maxResult<0)maxResult=0;
    
    if(!isNumeric(query.offset) || query.offset<0) query.offset=0;
    else if(query.offset>maxResult) query.offset=maxResult;
    
    if(!isNumeric(query.limit) || query.limit<0) query.limit=12;
    
    data.results=result.slice(query.offset, query.limit);
    pads.pads=data.results;
    
    callback(data);
  }
};

exports.registerRoute = function (hook_name, args, cb) {
  args.app.get('/admin/pads', function(req, res) {
    console.log('Admin pads opened');
    
    var render_args = {
      errors: []
    };
    res.send( eejs.require("ep_adminpads/templates/admin/pads.html", render_args) );
  });
};

exports.socketio = function (hook_name, args, cb) {
  var io = args.io.of("/pluginfw/admin/pads");
  io.on('connection', function (socket) {
    if (!socket.handshake.session.user || !socket.handshake.session.user.is_admin) return;

    socket.on("load", function (query) {
      console.log("load, query: %s",query);
      pads.search({parttern:'', offset:0, limit:12}, function (progress) {
        socket.emit("search-result", progress);
      });
    });

    socket.on("search", function (query) {
      pads.search(query, function (progress) {
        socket.emit("search-result", progress);
      });
    });

    socket.on("delete", function (plugin_name) {
      
    });
    socket.on
  });
};
