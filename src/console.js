'use strict';

const jenkins_host = process.env.JLR_ENDPOINT || 'http://localhost:8080/jenkins'
const allow_cidr = process.env.ALLOW_CIDR || 'x.x.x.x'


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

  let data = JSON.parse(event.body)

  if(data.job_name && data.build_number) {
    const jenkinsapi  = require('jenkins-api');
    let jenkins = jenkinsapi.init(jenkins_host)
    console.log('job: '+data.job_name + ' number: '+ data.build_number)
    jenkins.console_output(data.job_name, data.build_number, function(err, data) {
      if(err) {
        console.error(err)
        return;  
      }

      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: data.body
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
