//import { Policy, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { storage, anotherStorage } from "./storage/resource";
import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
import { myLambdaFunction } from "./functions/myLambdaFunction/resource";

export const backend = defineBackend({
  auth,
  data,
  storage,
  anotherStorage,
  myLambdaFunction,
});

// Define the policy statement for DynamoDB actions
//const dynamoPolicyStatement = new PolicyStatement({
  //effect: Effect.ALLOW,
  //actions: [
   // "dynamodb:GetItem",
   // "dynamodb:PutItem",
   // "dynamodb:Query",
  //  "dynamodb:Scan",
  //],
 // resources: [
 //   "arn:aws:dynamodb:us-east-2:905418145388:table/UserIndex-zym4s5tojfekjijegwzlhfhur4-NONE",
 //   "arn:aws:dynamodb:us-east-2:905418145388:table/GroupMessage-zym4s5tojfekjijegwzlhfhur4-NONE",
 // ],
//});

// Create the IAM policy and attach it to the Lambda function
//const dynamoPolicy = new Policy(backend.myLambdaFunction.resources.lambda, "DynamoDBAccessPolicy", {
 // statements: [dynamoPolicyStatement],
//});

//backend.myLambdaFunction.resources.lambda.role?.attachInlinePolicy(dynamoPolicy);
