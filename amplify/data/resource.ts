import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({

    User: a
        .model({
            id: a.id().required(),
            username: a.string().required(),
            email: a.string(),
            profilePicture: a.string(),
            //messages: a.hasMany('GroupMessage', 'senderId'),
            groups: a.hasMany('GroupChatUser', 'userId'),
        })
        .authorization((allow) => [
            allow.authenticated().to(['read', 'create', 'update']),
        ]),

    Room: a
        .model({
            name: a.string().required(),
            participants: a.string(),
            urlName: a.string().required(),
            messages: a.hasMany('Message', 'roomId'),
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


    GroupChat: a
        .model({
            groupname: a.string().required(),
            adminId: a.id().required(),  // The user who created the group chat
            members: a.hasMany('GroupChatUser', 'groupId'),
            messages: a.hasMany('GroupMessage', 'groupId'),
            isPrivate: a.boolean().default(false),
            urlName: a.string().required(),
             
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create', 'update']),
            allow.authenticated().to(['read']),
        ]),

    GroupMessage: a
        .model({
            type: a.enum(['text', 'image']),
            groupId: a.id().required(),
            //senderId: a.id().required(),
            content: a.string().required(),
            //timestamp: a.timestamp().required(),
            //sender: a.belongsTo('User', 'senderId'),
            userNickname: a.string().required(),
            group: a.belongsTo('GroupChat', 'groupId'),
            isRead: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create']),
            allow.authenticated().to(['read']),
        ]),

    GroupChatUser: a
        .model({
            groupId: a.id().required(),
            userId: a.id().required(),
            role: a.enum(['admin', 'member']),  // No .default() here
            user: a.belongsTo('User', 'userId'),
            group: a.belongsTo('GroupChat', 'groupId'),
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create', 'delete']),
            allow.authenticated().to(['read']),
        ])
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
    name: 'luke-chat',
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
})
