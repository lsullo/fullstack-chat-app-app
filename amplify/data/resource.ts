import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
    Room: a
        .model({
            name: a.string().required(),
            participants: a.string(),
            urlName: a.string().required(),
            messages: a.hasMany('Message', 'roomId'),
            isPrivate: a.boolean().default(false), // Add isPrivate field
        })
        .secondaryIndexes((index) => [index('urlName')])
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),
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
	Conversation: a
        .model({
            name: a.string(), // Group name or direct message name
            isGroup: a.boolean().default(false), // Flag to indicate if it's a group chat
            createdBy: a.string(), // User who created the conversation
            lastMessageId: a.string(), // ID of the last message
            lastMessageContent: a.string(), // Content of the last message
            lastMessageAt: a.string(), // Timestamp of the last message
            messages: a.hasMany('Message', 'conversationId'), // Messages in this conversation
        })
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),
    GroupMember: a
        .model({
            conversationId: a.id(), // ID of the group conversation
            userId: a.string(), // ID of the user in the group
            addedAt: a.string(), // Timestamp when the user was added
            addedBy: a.string(), // ID of the user who added this member
            conversation: a.belongsTo('Conversation', 'conversationId'), // Link to the conversation
        })
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),
    User: a
        .model({
            username: a.string(),
            email: a.string(),
            profilePicture: a.string(),
            conversations: a.hasMany('Conversation', 'createdBy'), // Conversations created by the user
        })
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),
})


export type Schema = ClientSchema<typeof schema>

export const data = defineData({
    name: 'luke-chat',
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
})
