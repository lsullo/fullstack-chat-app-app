import { defineFunction } from '@aws-amplify/backend';

export const fullCircleLambda2 = defineFunction({
  name: 'fullCircleLambda2',
  entry: './handler.ts',
});