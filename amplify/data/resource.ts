import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
    Room: a
        .model({
            name: a.string().required(),
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
            messages: a.hasMany('GroupMessage', 'groupId'),
            adminId: a.id().required(),  
            members: a.hasMany('GroupUser', 'groupId'),  
        })
        .secondaryIndexes((index) => [index('groupUrlName')])
        .authorization((allow) => [
            allow.authenticated().to(['read','create'])
        ]),
        
    GroupMessage: a
        .model({
            groupId: a.id().required(),
            type: a.enum(['text', 'image']),
            content: a.string(),
            picId: a.string(),
            group: a.belongsTo('Group', 'groupId'),
            userNickname: a.string().required(),
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create']),
            allow.authenticated().to(['read']),
        ]),

    GroupUser: a
        .model({
            groupId: a.id().required(),
            userId: a.id().required(),
            role: a.enum(['admin', 'member']), 
            group: a.belongsTo('Group', 'groupId'),
            userNickname: a.string(),
            email: a.string(),
        })
        .authorization((allow) => [allow.authenticated().to(['create', 'read'])]),

    UserIndex: a
        .model({
            userId: a.id().required(),
            role: a.enum(['VIP','User']),
            userNickname: a.string(),
            email: a.string().required(),
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
