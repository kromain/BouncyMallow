var queryArgs = new Object();

function extractQueryArgs() {
  if (location.search) {
    var queryStrings = location.search.substring(1).split('&');
    for (var i = 0; i < queryStrings.length; i++) {
      var arg = queryStrings[i].split('=');
      queryArgs[arg[0]] = arg[1] ? Number(arg[1]) : 1;
    }
  }
}

function buildQueryString(queryargs) {
  var queryString = "";
  for(var arg in queryargs) {
    queryString += queryString ? "&" : "?";

    if (typeof(queryargs[arg]) === "boolean" && queryargs[arg])
      queryString += arg;
    else
      queryString += arg + "=" + queryargs[arg];
  }

  return queryString;
}
