const pm2 = require('pm2');
var exec = require('child_process').exec,
    async = require('async'),
    path = require("path"),
    AWS = require('aws-sdk'),
    fs = require('fs');

let execPath = __dirname + '/cmdSnapshot.sh';
var childProcess = exec(`sh ${execPath}`);

let bucketRegion = 'bangalore';
let identityPoolId = 'bangalore:123456';

AWS.config.update({
    region: bucketRegion,
    credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId
    })
});

childProcess.stdout.on('data', function (data) {
    console.log('stdout: ' + data.toString());
    let cmdData = {
        status: 'STARTED',
        output: data.toString()
    };
	process.send({ type: 'CMDSTATE', data: {cmdData}});
});

childProcess.stderr.on('data', function (data) {
    console.log('stderr: ' + data.toString());
    let cmdData = {
        status: 'ERROR',
        output: data.toString()
    };
	process.send({ type: 'CMDSTATE', data: {cmdData}});
});

childProcess.on('exit', function (code) {
    console.log('child process exited with code ' + code.toString());
    let cmdData = {
        status: 'EXIT'
    };
	process.send({ type: 'CMDSTATE', data: {cmdData}});
    uploadSnapShot();
});

let uploadSnapShot = function () {
    let s3 = new AWS.S3({
        apiVersion: '2006-03-01',
        params: {Bucket: 'snapshots'}
    });

    var directoryName = '/home/vinodh/screenshot/',
    directoryPath = path.resolve(directoryName);
    var folder = fs.readdirSync(directoryPath);
    var starttime = new Date();
    async.map(folder, function (filename, cb) {
        // console.log(' filename ' , filename);

        // console.log(' directoryPath ' , directoryPath);
        var filePath = path.join(directoryPath, filename);

        var options = {
            Key: 'vinodh'+'/'+starttime+'/'+filename,
            Body: fs.readFileSync(filePath),
            ACL: 'public-read'
        };

        s3.upload(options, cb);
    }, function (err, data) {
        if (err) console.log(' err while uploading ' , err);
        console.log(' data ' , data);
        let cmdData = {
            status: 'UPLOADED',
            output: data
        };
        process.send({ type: 'CMDSTATE', data: {cmdData}});
        deleteProcess('snapShot.js', 'snapCommando', () => {
            console.log(' snapCommando stopped');
        });
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
