var queryArgs = new Object();

function extractQueryArgs() {
  if (location.search) {
    var queryStrings = location.search.substring(1).split('&');
    for (var i = 0; i < queryStrings.length; i++) {
      var arg = queryStrings[i].split('=');
      if (arg.length == 1) {
        queryArgs[arg[0]] = true;
        continue;
      }

      var val = {};
      queryArgs[arg[0]] = (parseNumber(arg[1], val) || parseBool(arg[1], val) || parseObject(arg[1], val)) ? val.res : arg[1];
    }
  }
}

function parseNumber(str, obj) {
  obj.res = Number(str);
  return !isNaN(obj.res);
}

function parseBool(str, obj) {
  if (str !== "true" && str !== "false")
    return false;

  obj.res = (str === "true");
  return true;
}

function parseObject(str, obj) {
  var argv = str.split(';');
  if (argv.length < 2)
    return false;

    obj.res = new Object();
    for (var i = 0; i < argv.length; i+=2) {
      if (argv[i+1].length == 0) {
        obj.res[argv[i]] = true;
        continue;
      }

      var val = {};
      obj.res[argv[i]] = (parseNumber(argv[i+1], val) || parseBool(argv[i+1], val)) ? val.res : argv[i+1];
    }

    return true;
}

function buildQueryString(queryargs) {
  var queryString = "";
  for(var arg in queryargs) {
    queryString += queryString.length ? "&" : "?";

    if (typeof(queryargs[arg]) === "boolean" && queryargs[arg])
      queryString += arg;
    else
      queryString += arg + "=" + queryargs[arg];
  }

  return queryString;
}

function buildArgvString(queryargs) {
  var argvString = "";
  for(var arg in queryargs) {
      if (argvString.length)
        argvString += ";";
      argvString += arg + ";" + queryargs[arg];
  }

  return argvString;
}
