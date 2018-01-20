'use strict';

const JENKINS_HOST  = process.env.JLR_ENDPOINT  || 'http://jenkins.url'
const ALLOW_CIDR    = process.env.ALLOW_CIDR    || 'x.x.x.x'
const MAX_LOG_LINES = process.env.MAX_LOG_LINES || '200'

const async = require('async')
const jenkinsapi  = require('jenkins-api')

let jenkins = jenkinsapi.init(JENKINS_HOST)

let lookup_job_name = (event) => {
  return event.job_url.split('/').splice(1).join('/')
}

let build_console = (event, build_data, callback) => {
  let job_name = lookup_job_name(event)
  let build_number = event.build_number

  jenkins.console_output(job_name, build_number, function(err, data) {
    if(err) {
      callback(err)
    }
    let message = data.body.split('\r\n').splice(-MAX_LOG_LINES)
    message.unshift(build_data, '---')
    callback(null, message.join('\n'))
  })
}

let build_data = (event, callback) => {
  let job_name = lookup_job_name(event)
  let build_number = event.build_number

  jenkins.build_info(job_name, build_number, function(err, data) {
    if(err) {
      callback(err)
    }
    let build_data = data.builtOn ? 'built on ' + data.builtOn : 'probably built on master'
    callback(null, event, build_data)
  })
}

let restrict_access = (event, callback) => {
  let found = false

  let sourceIP = event['requestContext']
    && event['requestContext']['identity']['sourceIp'] || 'local'

  ALLOW_CIDR.split(' ').forEach(function(allow_mask) {
    if(sourceIP.includes(allow_mask)) {
      found = true
    }
  });

  if (!found && sourceIP !== 'local' && sourceIP !== 'test-invoke-source-ip') {
    let error_message = 'Requestor not in allow list: ' + sourceIP
    console.error(error_message)
    callback(error_message)
  }

  callback(null, event)
}

module.exports.console = (event, context, callback) => {
  async.waterfall([
    async.apply(restrict_access, event),
    build_data,
    build_console
  ], function(err, results) {
    if(err){
      console.error(err)
      callback(null, {
        statusCode: 403,
        headers: { 'Content-Type': 'text/plain' },
        body: '¯\\_(ツ)_/¯'
      })
    } else {
      console.log(results)
      callback(null, {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain' },
        body: results
      })
    }
  })
}
