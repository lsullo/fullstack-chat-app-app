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
            //groupId: a.id().required(),
            groupname: a.string().required(),
            groupUrlName: a.string().required(),
            messages: a.hasMany('GroupMessage', 'groupId'),
            adminId: a.id().required(),  // Admin of the group
            members: a.hasMany('GroupUser', 'groupId'),  // Connects to GroupUser for membership
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
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create']),
            allow.authenticated().to(['read']),
        ]),

    User: a
        .model({
            id: a.id().required(),
            username: a.string().required(),
            email: a.string(),
            profilepicId: a.string(),
            groups: a.hasMany('GroupUser', 'userId'),  // Connects to GroupUser for membership
        })
        .authorization((allow) => [
            allow.authenticated().to(['read', 'create', 'update']),
        ]),

    GroupUser: a
        .model({
            groupId: a.id().required(),
            userId: a.id().required(),
            role: a.enum(['admin', 'member']),  // Role can be admin or member
            group: a.belongsTo('Group', 'groupId'),
            user: a.belongsTo('User', 'userId'),
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
