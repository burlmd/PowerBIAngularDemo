    var app = (function ($, AuthenticationContext, window) {

        var CONSTANTS = {
            POWER_BI_ACCESS_TOKEN_URI: "https://analysis.windows.net/powerbi/api",
            POWER_BI_LIST_ALL_TILES_URI: "https://api.powerbi.com/beta/myorg/dashboards/7949bd50-ff2d-4b21-89a0-42a680950f93/tiles",
            POWER_BI_LIST_ALL_DATASETS_URI: "https://api.powerbi.com/v1.0/myorg/datasets",
            ADAL_CLIENT_APP_ID: "9f77ded1-56e5-4e4d-99e6-268c0af8b4b3",
            LATE_STOP_ACTIONS_HTML: "<button class=\"btn btn-info btnResolve\"><i class=\"icon-ok-circle\"></i> Resolve</button>"
        };

        $(document).ajaxStart(function () {
            $("#lblProcessing").removeClass("hide");
        });

        $(document).ajaxStop(function () {
            $("#lblProcessing").addClass("hide");
        });

        var authContext = new AuthenticationContext({ clientId: CONSTANTS.ADAL_CLIENT_APP_ID, postLogoutRedirectUri: window.location });

        // handle redirect from adal token requests
        if (authContext.isCallback(window.location.hash))
        {
            authContext.handleWindowCallback();

            var err = authContext.getLoginError();
            if (err)
            {                    
                alert("Error logging in.");
                console.log("Error: " + err);
            }
        }

        return {
            acquireAccessToken: function (resource) {
                var self = this;
                var deferred = $.Deferred();

                // get access token to power bi api
                authContext.acquireToken(resource, function (error, token) {
                    if (error || !token) {
                        deferred.reject(error || "Access token is blank.");
                    }
                    else {
                        deferred.resolve(token);
                    }
                });

                deferred.fail(function (error) {
                    self.showErrorMsg("Unable to obtain access token to Power BI api.");
                    console.log("Unable to obtain access token to Power BI api.", error);
                });

                return deferred.promise();
            },

            getPowerBiData: function (accessToken, endpointURI) {
                var self = this;
                return $.ajax({
                    url: endpointURI,
                    type: "GET",
                    beforeSend: function (xhr) { xhr.setRequestHeader("Authorization", "Bearer " + accessToken); }
                }).fail(function (xhr, status, error) {
                    self.showErrorMsg("Unable to retrieve Power BI data.  Error: " + status + " URI: " + endpointURI);
                    console.log("Unable to retrieve Power BI data.  jqXHR, status, error, endpointURI:", xhr, status, error, endpointURI);
                });
            },

            getStopsTrendingLate: function () {
                var self = this;
                return $.getJSON("@Html.Raw(rootDir)swift/dashboard/getStopsTrendingLateTableStorage").fail(function (xhr, status, error) {
                    self.showErrorMsg("Unable to get the stops trending late.");
                    console.log("ERROR getStopsTrendingLate:", xhr, status, error);
                });
            },

            isUserLoggedIn: function () {
                return (authContext.getCachedUser() !== null);
            },

            loginOAuth: function () {
                authContext.login();
            },

            logoutOAuth: function () {
                authContext.logOut();
            },

            loadCharts: function () {
                $("#chartContainer").removeClass("hide");
                $("#tableDataContainer").addClass("hide");

                var self = this;
                var accessToken = null;

                // get access token to power bi api
                self.acquireAccessToken(CONSTANTS.POWER_BI_ACCESS_TOKEN_URI)
                    .then(function (token) {
                        accessToken = token;
                        return self.getPowerBiData(accessToken, CONSTANTS.POWER_BI_LIST_ALL_TILES_URI);
                    })
                    .then(function (data) {
                        $("iframe", "#chartContainer").on("load", function () {
                            var iframeWidth = $(this).attr("width") || 520;
                            var iframeHeight = $(this).attr("height") || 360;
                            this.contentWindow.postMessage(JSON.stringify({ action: "loadTile", accessToken: accessToken, width: iframeWidth, height: iframeHeight }), "*");
                        });

                        $("#iframeStopsTrendingLate").attr("src", data.value[0].embedUrl);
                        $("#iframeTruckLocation").attr("src", data.value[1].embedUrl);
                        $("#iframeAccidentsPastWeek").attr("src", data.value[3].embedUrl);
                        $("#iframeAccidentsAgedCounter").attr("src", data.value[2].embedUrl);

                        // when the user clicks on a tile in the iframe, it will post messages to the parent window ... listen and handle those here.
                        $(window).on("message", function (event) {
                            var openedWindow = null;
                            var messageData = JSON.parse(event.originalEvent.data);
                            if (messageData.event === "tileClicked") {
                                $("iframe").each(function () {
                                    if ((this.contentWindow === event.originalEvent.source) && (this.id == "iframeStopsTrendingLate")) {
                                        var url = window.location.href + "?view=" + $(this).data("view");
                                        openedWindow = window.open(url, "SwiftData", "toolbars=1,status=1,width=1000,height=800,left=100,top=100,scrollbars=1,resizable=1");
                                        return false;
                                    }
                                });

                                /*  Do not use this until all charts are clickable.
                                if (!openedWindow) {
                                    self.showErrorMsg("Unable to determine which chart was clicked.  If the problem persists, contact your system administrator.");
                                }
                                */
                            }
                        });
                    });
            },

            loadTables: function (view, tripIds) {
                $("#chartContainer").addClass("hide");
                $("#tableDataContainer").removeClass("hide");

                var self = this;

                self.getStopsTrendingLate().then(function (data) {
                    console.log("getStopsTrendingLate:", data);

                    var rows = [];
                    $(data.stopsTrendingLate).each(function () {
                        rows.push([this.driver, this.trip, this.stop, this.minutesLate, CONSTANTS.LATE_STOP_ACTIONS_HTML]);
                    });

                    $("#lateStopsDataTable").dataTable({
                        bServerSide: false,
                        bDestroy: true,
                        bAutoWidth: false,
                        aaData: rows
                    }).on("click", ".btnResolve", function () {
                        self.resolveLateStop(1);
                    });
                });                    
            },

            showErrorMsg: function (errorMsg) {
                $("#errorContainer").removeClass("hide").text(errorMsg);
            },

            resolveLateStop: function (id) {

            }
        };
    }(jQuery, AuthenticationContext, window));
