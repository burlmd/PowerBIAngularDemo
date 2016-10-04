$(function () {
    var models = window['powerbi-client'].models;



    if (app.isUserLoggedIn()) {
        // if there is a "view" query string param then load the data for the specific view in the tables, otherwise load the charts
        var tableDataView = ""; // "@ViewBag.TableDataView";
        if (tableDataView) {
            app.loadTables(tableDataView);
        }
        else {
            app.loadCharts();
        }
    }
    else {
        app.loginOAuth();
    }


    // Scenario 1: Static Embed
    var staticReportUrl = 'https://app.powerbi.com/groups/me/reports/c7c5e850-f894-42c1-aaa7-890d200689f5';
    var $staticReportContainer = $('#reportstatic');



    var staticReport;

    fetch(staticReportUrl)
      .then(function (response) {
          if (response.ok) {
              return response.json()
                .then(function (embedConfig) {
                    staticReport = powerbi.embed($staticReportContainer.get(0), embedConfig);
                });
          }
          else {
              return response.json()
                .then(function (error) {
                    throw new Error(error);
                });
          }
      });

    var $fullscreen = $('#fullscreen');

    $fullscreen.on('click', function (event) {
        staticReport.fullscreen();
    });
});