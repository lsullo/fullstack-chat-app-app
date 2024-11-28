import { defineStorage } from '@aws-amplify/backend'

export const storage = defineStorage({
	name: 'chatpics',
	isDefault: true,
	access: (allow) => ({
	  'chat-pics/*': [allow.authenticated.to(['read', 'write'])],
	  'public/*': [
		allow.guest.to(['read']),
		allow.authenticated.to(['read', 'write']),
	  ],
	}),
  });
