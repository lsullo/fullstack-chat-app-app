import { defineFunction } from '@aws-amplify/backend';

export const VIPCreator = defineFunction({
  name: 'VIPCreator',
  entry: './handler.ts',
});
