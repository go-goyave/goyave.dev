import type MarkdownIt from 'markdown-it'
import type { RenderRule } from 'markdown-it/lib/renderer'
import container from 'markdown-it-container'

export const monoContainerPlugin = (md: MarkdownIt) => {
  md.use(...createContainer('mono', md))
}

type ContainerArgs = [typeof container, string, { render: RenderRule }]

function createContainer(klass: string, md: MarkdownIt): ContainerArgs {
  return [
    container,
    klass,
    {
      render(tokens, idx, _options, env) {
        const token = tokens[idx]
        const info = token.info.trim().slice(klass.length).trim()
        const attrs = md.renderer.renderAttrs(token)
        if (token.nesting === 1) {
          return `<div class="${klass} custom-block"${attrs}><pre><code>`
        } else return `</code></pre></div>\n`
      }
    }
  ]
}