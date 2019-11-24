exports.documentReady = async function(hooks, context) {
    if (context !== "admin/pads") {
        return;
    }

    let socket,
        loc = document.location,
        port = loc.port == "" ? (loc.protocol == "https:" ? 443 : 80) : loc.port,
        url = loc.protocol + "//" + loc.hostname + ":" + port + "/",
        pathComponents = location.pathname.split("/"),
        // Strip admin/plugins
        baseURL = pathComponents.slice(0, pathComponents.length - 2).join("/") + "/",
        resource = baseURL.substring(1) + "socket.io";

    let room = url + "pluginfw/admin/pads";

    let changeTimer;

    //connect
    socket = io.connect(room, {path: baseURL + "socket.io", resource: resource});

    $(".search-results").data("query", {
        pattern: "",
        offset: 0,
        limit: 12,
    });

    let doUpdate = false;
    const doAutoUpdate = function () {
        return $("#results-autoupdate").prop("checked");
    };

    let search = function () {
        clearTimeout(changeTimer);
        socket.emit("search", $(".search-results").data("query"));
    };

    let htmlEntities = function (padName) {
        return $("<div/>").text(padName).html();
    };

    let submitSearch = function () {
        let query = $(".search-results").data("query");
        query.pattern = $("#search-query")[0].value;
        query.offset = 0;
        search();
    };

    let isInt = function (input) {
        return typeof input === "number" && input % 1 === 0;
    };

    let formatDate = function (longtime) {
        let formattedDate = "";
        if (longtime != null && isInt(longtime)) {
            let date = new Date(longtime);
            let month = date.getMonth() + 1;
            formattedDate = date.getFullYear() + "-" + fillZeros(month) + "-" + fillZeros(date.getDate()) + " " + fillZeros(date.getHours()) + ":" + fillZeros(date.getMinutes()) + ":" + fillZeros(date.getSeconds());
        }
        return formattedDate;
    };

    let fillZeros = function (fillForm) {
        return isInt(fillForm) ? (fillForm < 10 ? "0" + fillForm : fillForm) : "";
    };

    function updateHandlers() {
        $("#progress.dialog .close").off("click").click(function () {
            $("#progress.dialog").hide();
        });

        $("#search-form").off("submit").on("submit", function (e) {
            e.preventDefault();
            submitSearch();
        });

        $("#do-search").off("click").click(submitSearch);

        $("#search-query").off("change paste keyup").on("change paste keyup", function (e) {
            clearTimeout(changeTimer);
            changeTimer = setTimeout(function () {
                e.preventDefault();
                submitSearch();
            }, 500);
        });

        $(".do-delete").off("click").click(function (e) {
            let row = $(e.target).closest("tr");
            let padID = row.find(".padname").text();
            if (confirm("Do you really want to delete the pad " + padID + "?"
        ))
            {
                doUpdate = true;
                socket.emit("delete", padID);
            }
        });

        $(".do-prev-page").off("click").click(function (e) {
            let query = $(".search-results").data("query");
            query.offset -= query.limit;
            if (query.offset < 0) {
                query.offset = 0;
            }
            search();
        });
        $(".do-next-page").off("click").click(function (e) {
            let query = $(".search-results").data("query");
            let total = $(".search-results").data("total");
            if (query.offset + query.limit < total) {
                query.offset += query.limit;
            }
            search();
        });
    }

    updateHandlers();

    socket.on("progress", function (data) {
        $("#progress .close").hide();
        $("#progress").show();

        $("#progress").data("progress", data.progress);

        let message = "Unknown status";
        if (data.message) {
            message = "<span class=\"status\">" + data.message.toString() + "</span>";
        }
        if (data.error) {
            message = "<span class=\"error\">" + data.error.toString() + "<span>";
        }
        $("#progress .message").html(message);

        if (data.progress >= 1) {
            if (data.error) {
                $("#progress").show();
            } else {
                if (doUpdate || doAutoUpdate()) {
                    doUpdate = false;
                    search();
                }
                $("#progress").hide();
            }
        }
    });

    socket.on("search-result", function (data) {
        let widget = $(".search-results")
            , limit = data.query.offset + data.query.limit
        ;
        if (limit > data.total) {
            limit = data.total;
        }

        widget.data("query", data.query);
        widget.data("total", data.total);

        widget.find(".offset").html(data.query.offset);
        widget.find(".limit").html(limit);
        widget.find(".total").html(data.total);

        widget.find(".results *").remove();
        let resultList = widget.find(".results");

        if (data.results.length > 0) {
            data.results.forEach(function (resultset) {
                let padName = resultset.padName;
                let lastEdited = resultset.lastEdited;
                let userCount = resultset.userCount;
                let row = widget.find(".template tr").clone();
                row.find(".padname").html("<a href=\"../p/" + encodeURIComponent(padName) + "\">" + htmlEntities(padName) + "</a>"
            )
                ;
                row.find(".last-edited").html(formatDate(lastEdited));
                row.find(".user-count").html(userCount);
                resultList.append(row);
            });
        } else {
            resultList.append("<tr><td colspan=\"4\" class=\"no - results\">No results</td></tr>");
        }

        updateHandlers();
    });

    socket.emit("load");
    search();
};
