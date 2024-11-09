import { defineFunction } from '@aws-amplify/backend';

export const myLambdaFunction = defineFunction({
  name: 'myLambdaFunction',
  entry: './handler.ts',
});
