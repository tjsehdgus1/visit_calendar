import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

type Env = {
  DATABASE_URL: string
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.mjs',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
})
