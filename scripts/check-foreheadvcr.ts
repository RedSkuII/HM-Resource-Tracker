import { createClient } from '@libsql/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN
})

const result = await client.execute({
  sql: 'SELECT title, default_role_id, guild_access_roles, guild_officer_roles FROM guilds WHERE title = ?',
  args: ['foreheadvcr']
})

console.log(JSON.stringify(result.rows, null, 2))
client.close()
