var eejs = require('ep_etherpad-lite/node/eejs')
  , padManager = require('ep_etherpad-lite/node/db/PadManager')
;

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
    ;
    data.results=pads.slice(query['offset'],query['limit']);
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
  var io = args.io.of("/pluginfw/pads");
  io.on('connection', function (socket) {
    if (!socket.handshake.session.user || !socket.handshake.session.user.is_admin) return;

    socket.on("load", function (query) {
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
  });
};
