'use strict';

const jenkins_host = process.env.JLR_ENDPOINT || 'http://localhost:8080/jenkins'
const allow_cidr = process.env.ALLOW_CIDR || 'x.x.x.x'
const MAX_LOG_LINES = process.env.MAX_LOG_LINES || '200'

module.exports.console = (event, context, callback) => {
  let found = false;
  let error = false;
  let sourceIP = event['requestContext']
    && event['requestContext']['identity']['sourceIp'] || 'local'

  allow_cidr.split(' ').forEach(function(allow_mask) {
    if(sourceIP.includes(allow_mask)) {
      found = true
    }
  });

  if (!found && sourceIP !== 'local' && sourceIP !== 'test-invoke-source-ip') {
    console.error('Requestor not in allow list: ' + sourceIP)

    callback(null, {
      statusCode: 403,
      headers: { 'Content-Type': 'text/plain' },
      body: '¯\\_(ツ)_/¯'
    });
    return;
  }

  if(event.job_url && event.build_number) {
    const jenkinsapi  = require('jenkins-api');
    let jenkins = jenkinsapi.init(jenkins_host)
    let job_path = event.job_url.split('/').splice(1).join('/')
    console.log('job: '+job_path + ' number: '+ event.build_number)

    jenkins.console_output(job_path, event.build_number, function(err, data) {
      if(err) {
        console.error(err)
        callback(null, {
          statusCode: 200,
          headers: { 'Content-Type': 'text/plain' },
          body: 'empty'
        });
        return;  
      }

      let jenkins_console_array = data.body.split('\n')
      let jenkins_console_log

      if(jenkins_console_array.length > MAX_LOG_LINES) {
        console.log('logs reduced to ' + MAX_LOG_LINES + ' lines.')
        jenkins_console_log = jenkins_console_array.splice(0, MAX_LOG_LINES).join('\n')
        jenkins_console_log = [
          'logs reduced to ' + MAX_LOG_LINES + ' lines',
          '-----------------------',
          ...jenkins_console_log
        ]
      } else {
        console.log('logs within limit. showing full logs')
        jenkins_console_log = jenkins_console_array.join('\n')
      }

      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: jenkins_console_log
      });
    })
    return;
  }

  callback(null, {
    statusCode: 403,
    headers: { 'Content-Type': 'text/plain' },
    body: '¯\\_(ツ)_/¯'
  });
  return;
}
