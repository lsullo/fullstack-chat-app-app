import { type ClientSchema, a, defineData } from '@aws-amplify/backend'

const schema = a.schema({
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
            allow.authenticated().to(['read','create','update', 'delete'])
        ]),
        
    GroupMessage: a
        .model({
            groupId: a.id().required(),
            type: a.enum(['text', 'image', 'system']),
            content: a.string(),
            picId: a.string(),
            group: a.belongsTo('Group', 'groupId'),
            userNickname: a.string().required(),
        })
        .authorization((allow) => [
            allow.owner().to(['read', 'create', 'delete']),
            allow.authenticated().to(['read', 'delete']),
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
        .authorization((allow) => [allow.authenticated().to(['create', 'read', 'delete'])]),

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
    name: 'billionaire-luke-chat',
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
})
