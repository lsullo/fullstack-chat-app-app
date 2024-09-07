import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({

    User: a
        .model({
            id: a.id().required(),
            username: a.string().required(),
            email: a.string(),
            profilePicture: a.string(),
            groups: a.hasMany('GroupUser', 'userId'),
        })
        .authorization((allow) => [
            allow.authenticated().to(['read', 'create', 'update']),
        ]),

    Room: a
        .model({
            name: a.string().required(),
            //participants: a.string(),
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


    Group: a
        .model({
            groupname: a.string().required(),
            groupUrlName: a.string().required(),
            gmessages: a.hasMany('GroupMessage', 'groupId'),
            adminId: a.id().required(),  // The user who created the group chat
            //members: a.hasMany('GroupChatUser', 'groupId'),
            //isPrivate: a.boolean().default(false),
            
             
        })
        .secondaryIndexes((index) => [index('groupUrlName')])
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),

    GroupMessage: a
        .model({
            groupId: a.id().required(),
            type: a.enum(['text', 'image']),
            content: a.string().required(),
            picId: a.string(),
            group: a.belongsTo('Group', 'groupId'),
            userNickname: a.string().required(),
            //senderId: a.id().required(),
            //timestamp: a.timestamp().required(),
            //sender: a.belongsTo('User', 'senderId'),
            //isRead: a.boolean().default(false),
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create']),
            allow.authenticated().to(['read']),
        ]),

    GroupUser: a
        .model({
            groupId: a.id().required(),
            userId: a.id().required(),
            role: a.enum(['admin', 'member']),  // No .default() here
            user: a.belongsTo('User', 'userId'),
            group: a.belongsTo('Group', 'groupId'),
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
