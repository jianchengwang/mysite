import { defineCollection, defineContentConfig } from '@nuxt/content'
import { z } from 'zod'

export default defineContentConfig({
  collections: {
    tech: defineCollection({
      source: 'tech/*.md',
      type: 'page'
    }),
    store: defineCollection({
      source: 'store/wenroudao-long/*.md',
      type: 'page'
    }),
    column: defineCollection({
      source: 'column/**',
      type: 'page'
    }),
    cloudnativeIntro: defineCollection({
      source: 'cloudnative-intro.md',
      type: 'page'
    }),
    about: defineCollection({
      source: 'about.md',
      type: 'page'
    }),
    links: defineCollection({
      source: 'links.md',
      type: 'page'
    }),
    dataset: defineCollection({
      source: 'dataset/columns.json',
      type: 'data',
      schema: z.object({
        // Define your JSON structure here
        // This is a basic example - adjust based on your actual data structure
        title: z.string().optional(),
        description: z.string().optional(),
        items: z.array(z.any()).optional()
      })
    })
  }
})
