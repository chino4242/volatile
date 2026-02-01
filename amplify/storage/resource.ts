import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'proving-ground-data',
    access: (allow) => ({
        'uploads/*': [
            allow.authenticated.to(['read', 'write', 'delete']),
            allow.guest.to(['read', 'write', 'delete']) // Check if we want guests to upload? Maybe strict it later.
        ],
        'config/*': [
            allow.authenticated.to(['read', 'write']),
        ]
    })
});
