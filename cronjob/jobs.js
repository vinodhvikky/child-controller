const jobJson = require('./jobs.json');
var exec = require('child_process').exec;

console.log(' ################# CRON_JOB_STARTED ################ ' );

exports.hourly_job = {

    on: '0 * * * *',    // Cron Job runs every Hour.
    // on: '*/2 * * * *',    // Cron Job testing.
    job: function () {
        console.log("hourly_job");
        for (let obj in jobJson) {
            let d = new Date();
            let h = d.getHours();
            h = 'h' + h;
            if (obj === h) {
                let script = jobJson[obj][0].script;
                var childProcess = exec(`${script}`);

                childProcess.stdout.on('data', function (data) {
                	console.log('stdout: ' + data.toString());
                });

                childProcess.stderr.on('data', function (data) {
                	console.log('stderr: ' + data.toString());
                });

                childProcess.on('exit', function (code) {
                	console.log('child process exited with code ' + code.toString());
                });
            }
        }
    },
    spawn: true
}
