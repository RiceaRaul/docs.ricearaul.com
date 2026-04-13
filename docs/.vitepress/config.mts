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
      { icon: 'github', link: 'https://github.com/RiceaRaul' },
      {
        icon: {
          svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>'
        },
        link: 'https://ko-fi.com/ricearaul',
        ariaLabel: 'Buy me a coffee on Ko-fi'
      }
    ]
  }
})
