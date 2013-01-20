exports.documentReady=function(hooks, context, cb){
  if(context != 'admin/pads') return cb;
  
  var socket,
  loc = document.location,
  port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port,
  url = loc.protocol + "//" + loc.hostname + ":" + port + "/",
  pathComponents = location.pathname.split('/'),
  // Strip admin/plugins
  baseURL = pathComponents.slice(0,pathComponents.length-2).join('/') + '/',
  resource = baseURL.substring(1) + "socket.io";

  //connect
  socket = io.connect(url, {resource : resource}).of("/pluginfw/admin/pads");

  $('.search-results').data('query', {
    pattern: '',
    offset: 0,
    limit: 12,
  });

  var doUpdate = false;

  var search = function () {
    socket.emit("search", $('.search-results').data('query'));
  }

  var submitSearch=function () {
    var query = $('.search-results').data('query');
    query.pattern = $("#search-query")[0].value;
    query.offset = 0;
    search();
  };
  
  function updateHandlers() {
    $("#progress.dialog .close").unbind('click').click(function () {
      $("#progress.dialog").hide();
    });

    $("#search-form").unbind('submit').bind('submit', function(e){
      e.preventDefault();
      submitSearch();
    });
    
    $("#do-search").unbind('click').click(submitSearch);

    $(".do-delete").unbind('click').click(function (e) {
      var row = $(e.target).closest("tr");
      var padID=row.find(".padname").text();
      if(confirm("Do you really want to delete the pad '"+padID+"' ?")){
        doUpdate = true;
        socket.emit("delete", padID);
      }
    });

    $(".do-prev-page").unbind('click').click(function (e) {
      var query = $('.search-results').data('query');
      query.offset -= query.limit;
      if (query.offset < 0) {
        query.offset = 0;
      }
      search();
    });
    $(".do-next-page").unbind('click').click(function (e) {
      var query = $('.search-results').data('query');
      var total = $('.search-results').data('total');
      if (query.offset + query.limit < total) {
        query.offset += query.limit;
      }
      search();
    });
  }

  updateHandlers();

  socket.on('progress', function (data) {
    console.log(data);
    if (data.progress > 0 && $('#progress.dialog').data('progress') > data.progress) return;

    $("#progress.dialog .close").hide();
    $("#progress.dialog").show();

    $('#progress.dialog').data('progress', data.progress);

    var message = "Unknown status";
    if (data.message) {
      message = "<span class='status'>" + data.message.toString() + "</span>";
    }
    if (data.error) {
      message = "<span class='error'>" + data.error.toString() + "<span>";            
    }
    $("#progress.dialog .message").html(message);
    $("#progress.dialog .history").append("<div>" + message + "</div>");

    if (data.progress >= 1) {
      if (data.error) {
        $("#progress.dialog .close").show();
      } else {
        if (doUpdate) {
          doUpdate = false;
          socket.emit("load");
        }
        $("#progress.dialog").hide();
      }
    }
  });

  socket.on('search-result', function (data) {
    var widget=$(".search-results")
      , limit = data.query.offset + data.query.limit
    ;
    if(limit > data.total)limit=data.total;

    widget.data('query', data.query);
    widget.data('total', data.total);

    widget.find('.offset').html(data.query.offset);
    widget.find('.limit').html(limit);
    widget.find('.total').html(data.total);

    widget.find(".results *").remove();
    var resultList=widget.find('.results');
    
    data.results.forEach(function(pad_name) {
      var row = widget.find(".template tr").clone();
      row.find(".padname").html('<a href="../p/'+pad_name+'">'+pad_name+'</a>');
      resultList.append(row);
    });

    updateHandlers();
  });

  socket.emit("load");
  search();
  return cb;
};