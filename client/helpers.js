/**
 * Helper functions
 */

parseUrlQuery = function(queryString) {
    var urlQuery = {};
    var queryItems = queryString.split('&');
    _.each(queryItems, function(queryItem) {
        queryItem = queryItem.split('=');
        urlQuery[decodeURIComponent(queryItem[0])] = decodeURIComponent(queryItem[1]);
    });

    return urlQuery;
};
