import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  PlayerValue: a.model({
    sleeper_id: a.string().required(),
    full_name: a.string(),
    position: a.string(),
    team: a.string(),
    age: a.integer(),

    // FantasyCalc Data
    fantasy_calc_value: a.integer(),
    trend_30_day: a.integer(),
    fc_rank: a.integer(),
    redraft_value: a.integer(),

    // Ranks from Excel
    overall_rank: a.integer(),         // SF Rank
    one_qb_rank: a.integer(),          // 1QB Rank
    redraft_overall_rank: a.integer(), // Redraft Rank

    // Additional Analysis
    gemini_analysis: a.string(),
    notes_lrqb: a.string(),
    notes_rsp: a.string(),
    depth_of_talent_desc: a.string(),
    comparison_spectrum: a.string(),
    category: a.string(),

    // Metadata
    last_updated: a.string(),
  })
    .identifier(['sleeper_id']) // Primary Key
    .authorization((allow) => [
      allow.publicApiKey(), // Read-only for public (homepage)
      allow.authenticated(), // Authenticated users can read
      allow.group('Admins').to(['create', 'read', 'update', 'delete']), // Admins full access
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // API Key for public access
    },
  },
});
