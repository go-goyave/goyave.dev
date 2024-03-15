import { HeadConfig, defineConfig } from 'vitepress'
import { monoContainerPlugin } from './plugins/mono_container';

const title = 'Goyave'
const description = 'Description TODO'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Goyave",
  description: "The enterprise Golang REST API framework",
  srcDir: 'src',

  markdown: {
    config: (md) => {
      md.use(monoContainerPlugin)
    }
  },

  head: [
    ['link', { rel: 'icon', type: "image/png", sizes: "16x16", href: `/goyave_16.png` }],
    ['link', { rel: 'icon', type: "image/png", sizes: "32x32", href: `/goyave_32.png` }],
    ['link', { rel: 'icon', type: "image/png", sizes: "64x64", href: `/goyave_64.png` }],
    ['link', { rel: 'icon', type: "image/png", sizes: "128x128", href: `/goyave_128.png` }],
    ['link', { rel: 'icon', type: "image/png", sizes: "256x256", href: `/goyave_256.png` }],
    ['link', { rel: 'icon', type: "image/png", sizes: "512x512", href: `/goyave_512.png` }],
    // Handled in each page
    // ['meta', { property: 'twitter:title', content: title }],
    ['meta', { property: 'twitter:description', content: description }],
    ['meta', { property: 'twitter:image:src', content: `https://goyave.dev/goyave_banner.png` }],
    ['meta', { property: 'twitter:card', content: 'summary_large_image' }],
    // Handled in each page
    // ['meta', { property: 'og:title', content: title }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:description', content: description }],
    ['meta', { property: 'og:image', content: `https://goyave.dev/goyave_banner.png` }],
    ['meta', { property: 'og:site_name', content: "Goyave" }],
  ],

  sitemap: {
    hostname: 'https://goyave.dev'
  },

  transformHead: ({ pageData }) => {
    const head: HeadConfig[] = []

    const title = pageData.frontmatter.title || 'Goyave'
    const desc = pageData.frontmatter.description || description

    head.push(['meta', { property: 'og:title', content: title + ' | Goyave' }])
    head.push(['meta', { property: 'og:description',  content: desc }])
    head.push(['meta', { property: 'twitter:title', content: title + ' | Goyave' }])
    head.push(['meta', { property: 'twitter:description', content: desc }])
    head.push(['meta', { name: 'title', content: title }])

    return head
  },

  themeConfig: {

    logo: '/goyave_64.png',

    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'pkg.go.dev', link: 'https://pkg.go.dev/goyave.dev/goyave/v5' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/basics/introduction' },
          { text: 'Getting started', link: '/basics/getting-started' },
        ]
      },
      {
        text: 'Libraries',
        items: [
          { text: 'Filter', link: '/libraries/filter' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/go-goyave' },
      { icon: 'discord', link: 'https://discord.gg/mfemDMc' }
    ],

    search: {
      provider: 'algolia',
      options: {
        appId: 'VC27MERM2G',
        apiKey: '1e317c1609e981ea87b837780b98204e',
        indexName: 'goyave'
      }
    }
  }
})
