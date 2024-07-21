import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
	User: a
	  .model({
		username: a.string().required(),
		email: a.string().required(),
		// other user-specific fields
	  })
	  .authorization((allow) => [allow.authenticated().to(['read', 'create'])]),
	
	Room: a
	  .model({
		name: a.string().required(),
		urlName: a.string().required(),
		ownerId: a.id().required(),
		messages: a.hasMany('Message', 'roomId'),
		participants: a.hasMany('RoomUser', 'roomId'),
	  })
	  .secondaryIndexes((index) => [index('urlName')])
	  .authorization((allow) => [
		allow.authenticated().to(['read']),
		allow.owner().to(['create', 'update', 'delete']),
	  ]),
	
	Message: a
	  .model({
		roomId: a.id().required(),
		type: a.enum(['text', 'image']),
		content: a.string(),
		picId: a.string(),
		room: a.belongsTo('Room', 'roomId'),
		userNickname: a.string().required(),
	  })
	  .authorization((allow) => [
		allow.owner().to(['read', 'create']),
		allow.authenticated().to(['read']),
	  ]),
	
	RoomUser: a
	  .model({
		roomId: a.id().required(),
		userId: a.id().required(),
		role: a.enum(['owner', 'participant']),
		room: a.belongsTo('Room', 'roomId'),
		user: a.belongsTo('User', 'userId'),
	  })
	  .authorization((allow) => [
		allow.owner().to(['read', 'create', 'update', 'delete']),
		allow.authenticated().to(['read']),
	  ]),
  });
  
export type Schema = ClientSchema<typeof schema>

export const data = defineData({
	name: 'LTM-R-chat',
	schema,
	authorizationModes: {
		defaultAuthorizationMode: 'userPool',
	},
})
