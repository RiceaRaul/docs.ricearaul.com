import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Docs Ricea Ion Raul",
  description: "A VitePress Site",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'GTA V Map', link: '/gta-v-map/' },
      { text: 'Examples', link: '/markdown-examples' }
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
      '/': [
        {
          text: 'Examples',
          items: [
            { text: 'Markdown Examples', link: '/markdown-examples' },
            { text: 'Runtime API Examples', link: '/api-examples' }
          ]
        }
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/RiceaRaul' }
    ]
  }
})
