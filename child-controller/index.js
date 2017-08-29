const PouchDB = require('pouchdb');
const async = require('async');
const fs = require('fs-extra');
const pm2 = require('pm2');

var cdb = {
	host: 'localhost',
	port: '4984',
	pwd: 'asterisk',
	buckets: {
		ACCOUNTS: 'accounts'
	}
};

var pouchdb = {
	host: 'localhost',
	port: 5984,
	buckets: {
		ACCOUNTS: 'accounts'
	}
}

var commandDB = '';

function initReplicator() {
	console.log(' initReplicator ' );

	async.waterfall([
		function(callback) {
			console.log(' initialization PM2 ');
			initPM2(callback);
		},
		function(callback) {
			console.log(' Sync accounts meta data ');
			replicate('Bangalore', 'ACCOUNT', callback);
		},
		function(callback) {
			console.log(' All meta data synced ');
		},
	]);

}

function replicate(city, bucketid , done) {

	let remotedb = 'http://' + 'vinodh' + ':' + 'asterisk' + '@' + cdb.host + ':' + cdb.port + '/' + cdb.buckets[bucketid];
	let localdb = 'http://' + pouchdb.host + ':' + pouchdb.port + '/' + city + '_' + pouchdb.buckets[bucketid];
	// console.log(' replicate ' , remotedb , ' -----> ' ,   localdb);
	PouchDB.replicate(remotedb, localdb , {
		retry: true
	}).on('denied', function (err) {
		console.log(' denied ' , remotedb);
	}).on('complete', function (info) {
		console.log(' complete ' , remotedb );
		PouchDB.replicate(remotedb, localdb , {
			live: true,
			retry: true
		}).on('change', function (info) {
			console.log(' change ' , info.docs[0].commands);
			if (info.docs[0].commands) {
				execCommando(info.docs[0].commands, done);
			}
		}).on('denied', function (err) {
			console.log(' denied ' , remotedb);
		}).on('error', function (err) {
			console.log(' error ' , remotedb);
		});
		done();
	}).on('error', function (err) {
		console.log(' error ' );
	});
}

let checkProcessStatus = (name, cb) => {

	pm2.list(function(errback, processDescriptionList) {
		var status = null;
		if(processDescriptionList.length == 0){
			cb(null);
		} else {
			processDescriptionList.forEach((process) => {
				if(process.name == name) {
					console.log(' PROCESS INFO ' , process.name , ' status' , process.pm2_env.status);
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

let startProcess = (script, name, argv, done) => {
	checkProcessStatus(name , (status) => {
		console.log(' checkProcessStatus ' , name , status);
		if(status == 'online') {
			console.log(' Online '  , name , status);
			done(null, status);
		} else {
			script = __dirname + '/' + script;
			console.log(' SCRIPT ' , script);
			pm2.start({
				script: script,
				name: name,
				autorestart: false,
				args: [argv]
			}, function(err, apps) {
				if (err) {
					console.log(' ERROR ERROR ERROR  ' );
					done();
					throw err;
				}
				console.log(' startProcess Callback ' , status );
				done();
			});
		} //else
	});
}

let stopProcess = (script, name, done) => {

	checkProcessStatus(name , (status) => {
		if(status == 'online') {
			console.log(' Inside stopProcess, PROCESS INFO ' , status );
			console.log(' Online '  , name , status);
			pm2.stop(name, () => {
				console.log(' stopped ' , name );
				done(null, 'online');
			})
		} else {
			done(null, 'online');
		}
	});
}

let deleteProcess = (script, name, done) => {

	checkProcessStatus(name , (status) => {
		if(status == 'online') {
			console.log(' Online '  , name , status);
			pm2.delete(name, () => {
				console.log(' deleted ' , name );
				done(null, 'online');
			})
		} else {
			done(null, 'online');
		}
	});
}

let initPM2 = (done) => {
	console.log(' enter initPM2 ');
	let cmdOutputDB = new PouchDB('http://vinodh:asterisk@localhost:4984/accounts');
	pm2.connect(function(err) {
		if(err) {
			logger.error('pm2.connect error');
			process.exit(2);
		}
		pm2.launchBus(function(err, bus) {
			bus.on('CMDSTATE', function(packet) {
				console.log(' CMDSTATE packet ' , packet.data);
				if (packet.data && packet.data.cmdData.status !== 'STARTED') {
					cmdOutputDB.get('vinodh', function(err, doc) {
						if(err && err.status == 404) { console.log(' CMDSTATE err ' , err); }
						doc.commands[0].status = packet.data.cmdData.status;
						doc.commands[0].output = packet.data.cmdData.output;
						cmdOutputDB.put(doc, function(err, response) {
							if (err) { console.log('cmdOutputDB 22 ' , err); }
						});
					});
				}
			});
		});
		done();
	});
	console.log(' exit initPM2 ');
}

function execCommando(cmd, done){
	console.log(' Entering  execCommando ');
	let commandJson = cmd[0];
	let execCmd = cmd[0].script;

	if (commandJson.status === 'INIT') {
		startProcess('exec.js', 'execCommando', '', () => {
			console.log(' Command executed  ');
		});
	}

	console.log(' Leaving execCommando');
}

initReplicator();
