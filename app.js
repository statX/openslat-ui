// My SocketStream 0.3 app
var express = require('express'),
		ss = require('socketstream'),
		fs = require('fs'),
		path = require('path'),
		server,
		app = express(),
		RouteDir = 'server/routes',
		files = fs.readdirSync(RouteDir),
		conf = require('./conf');

// code & template formatters
// ss.client.formatters.add(require('ss-jade'));
//ss.client.formatters.add(require('ss-stylus'));
// user server-side compiled Hogan (Mustache) templates
// ss.client.templateEngine.use(require('angular'));
//ss.client.templateEngine.use(require('ss-hogan'));

app.use(express.bodyParser());

// Define a single-page client called 'main'
ss.client.define('main', {
		view: 'app.html',
		css: ['libs', 'main.css', 'impage.css', 'optionspage.css', 'forms.css'],
		code: ['libs', 'app'],
		tmpl: '*'
});

// pack / minify if product env
if (ss.env === 'production') {
		ss.client.packAssets();
} else {
		// serve tests in non-production env
		ss.client.define('tests', {
				view: 'tests.jade',
				css: ['tests'],
				code: ['libs', 'app', 'tests'],
				tmpl: '*'
		});

		app.get('/tests', function (req, res) {
				res.serveClient('tests');
		});
}

files.forEach(function (file) {
		var filepath = path.resolve('./', RouteDir, file),
				route = require(filepath);
		console.log('adding ExpressJS routes found in %s', filepath);
		route.init(app, ss);
});

var exec = require('child_process').exec;
var child;
var calculating = false;
var calc_result = null;

// A POST request to /calculate sends the input data
app.post('/calculate', function(req, res) {
    if (calculating) {
        res.send(500, 'ERROR: Calculation already in progress');
    } else {
        calculating = true;
        
        // Start the JAR
        child = exec('java -jar openslat.jar',
          function (error, stdout, stderr) {
            console.log('stdout: ' + stdout);
            console.log('stderr: ' + stderr);
            if (error !== null) {
              console.log('exec error: ' + error);
            }
            calc_result = stdout;
        });
        var json = JSON.stringify(req.body);
        console.log(json);
        child.stdin.write(json+"\n");
        child.stdin.end();
        res.send('Data received');
    }
});

// A GET request to /calculate checks the calculation status
app.get('/calculate', function(req, res) {
    if (calculating) {
        if (calc_result != null) {
            res.send(calc_result);
            calculating = false;
            calc_result = null;
        } else {
            res.send('calculating');
        }
    } else {
        res.send(500, 'ERROR: No calculation in progress')
    }
});

// catch-all route
app.get('/*', function (req, res) {
		res.serveClient('main');
});

// start 'er up
server = app.listen(conf.webServer.port, function () {
		console.log('web server listening on port %d in %s mode', conf.webServer.port, ss.env);
});
ss.start(server);

// append socketstream middleware
app.stack = ss.http.middleware.stack.concat(app.stack);

// this is just demo of pubsub
/*setInterval(function () {
		ss.api.publish.all('foo:bar', Date());
}, 3000);*/

process.on('uncaughtException', function (err) {
		console.log('ERR (uncaught) ', err);
});