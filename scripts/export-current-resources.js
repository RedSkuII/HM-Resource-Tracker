import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { resources } from '../lib/db'
import { eq } from 'drizzle-orm'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const db = drizzle(client)

async function exportResources() {
  try {
    const houseRes = await db
      .select()
      .from(resources)
      .where(eq(resources.guildId, 'house-melange'))
    
    const template = houseRes.map(r => ({
      name: r.name,
      category: r.category,
      description: r.description,
      icon: r.icon,
      multiplier: r.multiplier
    }))
    
    console.log(JSON.stringify(template, null, 2))
    console.log(`\nTotal resources: ${template.length}`)
  } catch (error) {
    console.error('Error:', error)
  }
}

exportResources()
