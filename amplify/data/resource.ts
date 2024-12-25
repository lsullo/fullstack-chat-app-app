import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
    Group: a
        .model({
            UserIndexId: a.id().required(),
            groupname: a.string().required(),
            groupUrlName: a.string().required(),
            messages: a.hasMany('GroupMessage', 'groupId'),
            adminId: a.id().required(),  
            members: a.hasMany('GroupUser', 'groupId'), 
            chatstatus: a.enum(['Def','Activated']), 
            creator: a.belongsTo('UserIndex', 'UserIndexId'),
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
            allow.authenticated().to(['create', 'read', 'delete'])
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
        .secondaryIndexes((index) => [index('userId')])
        .authorization((allow) => [
            allow.authenticated().to(['create', 'read', 'delete'])
        ]),

    UserIndex: a
        .model({
            userId: a.id().required(),
            RedPill: a.enum(['Owner','Lawyer','User', 'VIP']),
            userNickname: a.string(),
            email: a.string().required(),
            recentgroup: a.string(),
            photoId: a.string(),
            bio: a.string(),
            lockedbio: a.string(),
            groups: a.hasMany('Group', 'UserIndexId'), 
            stripeCustomerId: a.string(),
        })
        .secondaryIndexes((index) => [
            index('userId'), 
            index('stripeCustomerId'),])
        
        .authorization((allow) => [
            allow.authenticated().to(['create', 'read', 'update'])
        ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
    name: 'billionaire-luke-chat',
    schema,
    authorizationModes: {
        defaultAuthorizationMode: 'userPool',
    },
});
