var cronjob = require('node-cron-job');

cronjob.setJobsPath(__dirname + '/jobs.js');
cronjob.startJob('hourly_job');
