import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Documentation Ricea Raul",
  description: "Documentation and guides for projects by Ricea Raul",
  cleanUrls: true,
  sitemap: {
    hostname: 'https://docs.ricearaul.com',
  },
  head: [
    ['meta', { name: 'author', content: 'Ricea Raul' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:site_name', content: 'Documentation Ricea Raul' }],
    ['meta', { property: 'og:url', content: 'https://docs.ricearaul.com' }],
    ['meta', { property: 'og:title', content: 'Documentation Ricea Raul' }],
    ['meta', { property: 'og:description', content: 'Documentation and guides for projects by Ricea Raul' }],
    ['meta', { name: 'twitter:card', content: 'summary' }],
    ['meta', { name: 'twitter:title', content: 'Documentation Ricea Raul' }],
    ['meta', { name: 'twitter:description', content: 'Documentation and guides for projects by Ricea Raul' }],
    ['link', { rel: 'canonical', href: 'https://docs.ricearaul.com' }],
  ],
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'GTA V Map', link: '/gta-v-map/' },
      { text: 'ManualMapping.Net', link: '/manual-mapping/' },
    ],

    sidebar: {
      '/gta-v-map/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/gta-v-map/' },
            { text: 'Installation', link: '/gta-v-map/getting-started/installation' },
            { text: 'Configuration', link: '/gta-v-map/getting-started/configuration' },
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'Properties', link: '/gta-v-map/api/properties' },
            { text: 'Methods', link: '/gta-v-map/api/methods' },
            { text: 'Events', link: '/gta-v-map/api/events' },
          ]
        },
        {
          text: 'Framework Guides',
          items: [
            { text: 'Vanilla HTML', link: '/gta-v-map/frameworks/vanilla' },
            { text: 'React', link: '/gta-v-map/frameworks/react' },
            { text: 'Angular', link: '/gta-v-map/frameworks/angular' },
          ]
        },
      ],
      '/manual-mapping/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Overview', link: '/manual-mapping/' },
            { text: 'Installation', link: '/manual-mapping/getting-started/installation' },
            { text: 'Configuration', link: '/manual-mapping/getting-started/configuration' },
          ]
        },
        {
          text: 'API Reference',
          items: [
            { text: 'IMapper', link: '/manual-mapping/api/mapper' },
            { text: 'TypeConverter', link: '/manual-mapping/api/type-converter' },
            { text: 'BidirectionalConverter', link: '/manual-mapping/api/bidirectional-converter' },
          ]
        },
        {
          text: 'Guides',
          items: [
            { text: 'Dependency Injection', link: '/manual-mapping/guides/dependency-injection' },
            { text: 'ProjectTo & SQL', link: '/manual-mapping/guides/project-to' },
            { text: 'Benchmarks', link: '/manual-mapping/guides/benchmarks' },
          ]
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/RiceaRaul' }
    ]
  }
})
