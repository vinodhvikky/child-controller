var exec = require('child_process').exec;
const pm2 = require('pm2');

let execPath = __dirname + '/commando.sh';
var childProcess = exec(`sh ${execPath}`);

childProcess.stdout.on('data', function (data) {
	console.log('stdout: ' + data.toString());
	let cmdData = {
		status: 'STARTED',
		output: data.toString()
    };
});

childProcess.stderr.on('data', function (data) {
	console.log('stderr: ' + data.toString());
	let cmdData = {
		status: 'ERROR',
		output: data.toString()
    };
});

childProcess.on('exit', function (code) {
	console.log('child process exited with code ' + code.toString());
	let cmdData = {
        status: 'EXIT'
    };
	deleteProcess('exec.js', 'execCommando', () => {
        console.log(' execCommando stopped');
    });
});

let checkProcessStatus = (name, cb) => {

	pm2.list(function(errback, processDescriptionList) {
		var status = null;
		if(processDescriptionList.length == 0){
			cb(null);
		} else {
			processDescriptionList.forEach((process) => {
				if(process.name == name) {
					status = process.pm2_env.status;
					cb(status);
				}
			});
			if(status == null){
				cb(null);
			}
		}
	});
}

let deleteProcess = (script, name, done) => {

	checkProcessStatus(name , (status) => {
		if(status == 'online') {
			pm2.delete(name, () => {
				done(null, 'online');
			})
		} else {
			done(null, 'online');
		}
	});
}
