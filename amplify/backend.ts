import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { storage } from './storage/resource';
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { myLambdaFunction } from './functions/myLambdaFunction/resource';


/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
export const backend = defineBackend({
  auth,
  data,
  storage,
  myLambdaFunction, 
});

const dynamoPolicyStatement = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["dynamodb:PutItem"],
  resources: [
    "arn:aws:dynamodb:us-east-2:905418145388:table/GroupUser-3karac5s7faufn5c6c2fwhzeve-NONE",
  ],
});


const dynamoPolicy = new Policy(backend.myLambdaFunction.resources.lambda, 'DynamoDBAccessPolicy', {
  statements: [dynamoPolicyStatement],
});


backend.myLambdaFunction.resources.lambda.role?.attachInlinePolicy(dynamoPolicy);