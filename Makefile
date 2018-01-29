
function_name = jlr

env := missing
profile := sms-dev
region := us-west-2
stage := v1
allow_cidr := x.x.x.x
vpc_env := dev

AWS_PARAMS=AWS_PROFILE=$(profile) AWS_DEFAULT_REGION=${region}

vpc_id := $(shell ${AWS_PARAMS} aws ec2 describe-vpcs --filters "Name=tag:Environment,Values=${vpc_env}" --query Vpcs[0].VpcId --output text)
subnet_ids := $(shell ${AWS_PARAMS} aws ec2 describe-subnets --filters "Name=vpc-id,Values=${vpc_id}" --query Subnets[*].SubnetId --output text)

LAMBDA_PARAMS=ALLOW_CIDR="$(allow_cidr)" ENV=${env} JENKINS_HOST=${jenkins_host} VPC_ID=${vpc_id} VPC_SUBNETS="${subnet_ids}"

vpc:
	@echo ${vpc_id}
subnets:
	@echo ${subnet_ids}

local-invoke:
	${AWS_PARAMS} ${LAMBDA_PARAMS} ./node_modules/.bin/lambda-local -t 20 -f $(function_file) -e $(event_file)

deploy:
	${AWS_PARAMS} ${LAMBDA_PARAMS} ./node_modules/.bin/serverless deploy --stage ${stage}

invoke:
	${AWS_PARAMS} ${LAMBDA_PARAMS} ./node_modules/.bin/serverless invoke --stage ${stage} -f $(function_name)

remove:
	${AWS_PARAMS} ${LAMBDA_PARAMS} ./node_modules/.bin/serverless remove --stage ${stage}
