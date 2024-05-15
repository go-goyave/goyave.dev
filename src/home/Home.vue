<template>
  <div ref="root" @mousemove="mousePos" class="home">
    <section class="section center ellipse">
      <div class="center">
        <img src="../goyave_256.png" class="logo" />
      </div>
      <h1 class="title center">Goyave</h1>
      <h2 class="subtitle center text-center">The enterprise Golang REST API framework</h2>
      <div class="quote contained text-center">
        <p>
          <strong>Goyave</strong> an opinionated all-in-one Golang web framework focused on REST APIs, with emphasis on code reliability, maintainability and developer experience.
        </p>
      </div>
      <div class="spaced-container center">
        <VPButton
          tag="a"
          size="big"
          theme="brand"
          href="/getting-started/installation.html"
          text="Get started"
          class="dynamic-border"
        />
        <VPButton
          tag="a"
          size="big"
          theme="alt"
          href="/introduction.html"
          text="Introduction"
          class="dynamic-border"
        />
      </div>
    </section>
    <section class="section center horizontal-gradient">
      <div class="highlights contained">
        <div class="card horizontal dynamic-border col4">
          <RoundGraphIcon class="icon" />
          <div class="card-content">
            <h4>Clean code</h4>
            <p>Build robust and future-proof applications brimming with elegance thanks to the strong architecture and conventions the framework provides.</p>
          </div>
        </div>
        <div class="card dynamic-border col2">
          <HeartIcon class="icon heart" />
          <h4>Developer experience</h4>
          <p>Backend development is made easy and enjoyable. An extensive documentation will answer all your questions.</p>
        </div>
        <div class="card dynamic-border col2">
          <ShieldIcon class="icon" />
          <h4>Resilience</h4>
          <p>
            Applications are reliable and resilient out of the box thanks to advanced error handling, recovery and extensive testing.
          </p>
        </div>
        <div class="card horizontal dynamic-border col4">
          <BoltIcon class="icon" />
          <div class="card-content">
            <h4>Faster development</h4>
            <p>
              Setup your project with no friction. Enjoy a complete suite of powerful features and tools, without bloat or magic. Save time. 
            </p>
          </div>
        </div>
      </div>
    </section>
    <section class="section center">
      <h3 class="subtitle">Start creating value, right now!</h3>
      <div class="quote text-center">
        <p>
          Focus on the business logic of your application instead of spending time on technical aspects. 
        </p>
      </div>
      <div class="features-cloud contained">
        <span>Routing</span>
        <span>Controllers</span>
        <span>Middleware</span>
        <span>Parsing</span>
        <span>Validation</span>
        <span>Transactions</span>
        <span>Authentication</span>
        <span>Configuration</span>
        <span>Testing</span>
        <span>Database</span>
        <span>ORM</span>
        <span>Localization</span>
        <span>Error handling</span>
        <span>Structured logging</span>
        <span>CORS</span>
        <span>File systems</span>
        <span>Websockets</span>
        <span>Dynamic filtering</span>
        <span>DTO conversion</span>
        <span>Model mapping</span>
        <span>Data exploration</span>
      </div>
    </section>
    <section class="section center">
      <div class="card contained content-center dynamic-border">
        <h3 class="subtitle">Ready for the real world</h3>
        <div class="quote text-center">
          <p>
            Designed with businesses constraints and use-cases in mind.<br>
            These companies already use Goyave in production:
          </p>
        </div>
        <div class="contained used-by">
          <a href="https://adagio.io" target="_blank" rel="nofollow">
              <img src="/usedby/adagio.webp" width="100" height="90" alt="Adagio.io" style="background-color: #fff"/>
          </a>
        </div>
      </div>
    </section>
    <section class="section">
      <h3 class="subtitle">And that's not all!</h3>
      <p>Goyave has so much more to offer.</p>
      <VPButton
          tag="a"
          size="big"
          theme="brand"
          href="/getting-started/installation.html"
          text="Get started"
          class="dynamic-border"
        />
    </section>
    <footer class="section">
      <p class="light">MIT Licensed | Copyright © 2024 Jérémy LAMBERT (SystemGlitch)</p>
    </footer>
  </div>
  <svg aria-hidden="true" focusable="false" style="width:0;height:0;position:absolute;">
    <linearGradient id="icon-gradient" gradientTransform="rotate(45)">
      <stop offset="0%" stop-color="var(--icon-gradient-c-stop-1)" />
      <stop offset="50%" stop-color="var(--icon-gradient-c-stop-2)" />
      <stop offset="100%" stop-color="var(--icon-gradient-c-stop-3)" />
    </linearGradient>
  </svg>
</template>

<script setup lang="ts">
import "./vite.d.ts"
import { VPButton } from "vitepress/theme"
import { ref } from "vue"
import useDynamicBorders from './dynamicBorder'
import ShieldIcon from './icons/shield-check.svg'
import HeartIcon from './icons/hearts.svg'
import RoundGraphIcon from './icons/round-graph.svg'
import BoltIcon from './icons/bolt.svg'

const root = ref<HTMLElement | null>(null)
const { mousePos } = useDynamicBorders(root)

</script>

<style scoped>
.home {
  --vp-layout-max-width: 1024px;
  --vp-gradient-tranparency: 30%;
  --vp-card-shadow-color: rgb(0 0 0 / 0.05);
  --vp-contained-padding: 0;
  overflow: hidden;
}

@media (max-width: 1023px) {
  .home {
    --vp-layout-max-width: 100vw;
    --vp-contained-padding: 1rem;
  }
}

.dark .home {
  --vp-gradient-tranparency: 30%;
  --vp-card-shadow-color: rgb(255 255 255 / 0.05);
}

.title {
  font-family: var(--vp-font-family-goyave);
  font-size: 6rem;
  line-height: normal;
}

.subtitle {
  margin-top: 1rem;
  font-size: 2rem;
  background-clip: text;
  line-height: normal;
  background: linear-gradient(180deg, color-mix(in srgb, var(--vp-c-text-1) 30%, transparent) 0%, var(--vp-c-text-1) 80%);
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

h2, h3 {
  margin-top: 1rem;
  padding-top: 24px;
  text-align: center;
}

h2 {
  border-top: none !important;
  margin-top: 0;
}

h3 {
  font-size: 3rem !important;
}

p {
  font-size: 1.1rem;
  white-space: pre-line;
}

.logo {
  max-width: 256px;
}

div:has(> .logo) {
  margin-bottom: 1rem;
}

.section {
  padding: 4rem 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
}

.content-center {
  justify-content: center;
  align-items: center;
}

.contained {
  max-width: var(--vp-layout-max-width);
  width: var(--vp-layout-max-width);
  padding-left: var(--vp-contained-padding);
  padding-right: var(--vp-contained-padding);
}

.row {
  display: flex;
  flex-direction: row;
  gap: 1rem;
}

.row > .card {
  flex-grow: 1;
}

.section:first-child {
  padding-top: calc(4rem + var(--vp-nav-height)) !important;
}

.ellipse {
  background: radial-gradient(ellipse 80% 50% at 50% -20%, color-mix(in srgb, var(--vp-c-brand-0) var(--vp-gradient-tranparency), transparent), transparent);
}

.horizontal-gradient {
  background: radial-gradient(ellipse 100% 35% at 50% 60%, color-mix(in srgb, var(--vp-c-brand-0) var(--vp-gradient-tranparency), transparent), transparent);
}

footer {
  padding-top: 8rem !important;
  background: radial-gradient(ellipse 80% 100% at 50% 120%, color-mix(in srgb, var(--vp-c-brand-0) var(--vp-gradient-tranparency), transparent), transparent);
}

footer.section {
  padding-bottom: 1rem;
}

footer p {
  font-size: 1rem;
}

.center {
  margin-left: auto;
  margin-right: auto;
}

.text-center {
  text-align: center;
}

.spaced-container {
  display: flex;
  gap: 1.5rem;
  padding: 3rem 0;
}

.card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
  border-radius: 1rem;
  position: relative;
  background: linear-gradient(180deg, var(--vp-c-bg-alt) 0%, var(--vp-c-bg) 20%);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px var(--vp-card-shadow-color), inset 0px 0px 0px 1px color-mix(in srgb, var(--vp-c-border) 50%, transparent);
  white-space: pre-line;
  text-align: center;
  justify-content: center;
}

.dark .card {
  background: linear-gradient(180deg, var(--vp-c-bg-alt) 0%, var(--vp-c-bg) 100%);
}

.card.horizontal {
  flex-direction: row;
  align-items: center;
}

.card .card-content {
  padding: 1rem;
}

.card p {
  color: var(--vp-c-text-2);
  font-size: 1rem;
}

.card > * {
  z-index: 1;
}
.card h4 {
  font-size: 1.4rem;
}

.quote {
  display: flex;
  max-width: 70%;
  padding-top: 2rem;
}

.quote > p {
  font-size: 1.25rem;
  line-height: 2rem;
  color: var(--vp-c-text-3);
}

.dark .quote > p {
  color: var(--vp-c-text-2);
}

.light {
  color: var(--vp-c-text-2);
}

.highlights {
  display: grid;
  --row: minmax(0,1fr);
  grid-template-columns: [page-start] var(--row) [prose-start] var(--row) var(--row) var(--row) var(--row) [prose-end] var(--row) [page-end];
  gap: 1rem;
}

.highlights > .col4 {
  grid-column: auto / span 4;
}

.highlights > .col2 {
  grid-column: auto / span 2;
}

.used-by {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.features-cloud {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  grid-template-rows: repeat(8, minmax(0, 1fr));
  grid-auto-flow: column;
  grid-auto-columns: auto;
  margin-top: 4rem;
  justify-content: center;
}

.features-cloud > span {
  flex-grow: 1;
  max-width: 200px;
  font-size: 1.1rem;
  text-align: center;
  position: relative;
  padding: 0.8rem 1.2rem;
  border-radius: 1rem;
  background: var(--vp-c-bg);
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px var(--vp-card-shadow-color), inset 0px 0px 0px 1px color-mix(in srgb, var(--vp-c-border) 50%, transparent);
}

.features-cloud > span::before {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  width: calc(100%+4px);
  height: calc(100%+4px);
  background: linear-gradient(45deg, var(--vp-c-brand-0) 0%, var(--vp-c-brand-3) 50%, var(--vp-c-brand-2) 100%);
  inset: -2px;
  z-index: -1;
  border-radius: calc(1rem + 2px);
}

.VPButton {
  position: relative;
}

.dynamic-border {
  --vp-c-dynamic-border: var(--vp-c-brand-2);
  --vp-dynamic-border-radius: 250px;
}

.dynamic-border::before {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  width: calc(100%+4px);
  height: calc(100%+4px);
  background: radial-gradient(var(--vp-dynamic-border-radius) circle at var(--x) var(--y),var(--vp-c-dynamic-border) 0, transparent 100%);
  will-change: background;
  inset: -2px;
  z-index: -1;
  border-radius: calc(1rem + 2px);
}

.dynamic-border.VPButton::before {
  border-radius: 25px;
  inset: -3px;
  width: calc(100%+6px);
  height: calc(100%+6px);
  --vp-dynamic-border-radius: 100px;
}

.icon {
  padding: 1rem;
  max-width: 100%;
  max-height: 200px;
  height: auto;
}

#icon-gradient {
  --icon-gradient-c-stop-1: var(--vp-c-brand-3);
  --icon-gradient-c-stop-2: var(--vp-c-brand-1);
  --icon-gradient-c-stop-3: var(--vp-c-brand-1);
}

.dark #icon-gradient {
  --icon-gradient-c-stop-1: var(--vp-c-brand-3);
  --icon-gradient-c-stop-2: var(--vp-c-brand-1);
  --icon-gradient-c-stop-3: var(--vp-c-brand-0);
}
</style>
<style>
.home .icon path {
  stroke: url(#icon-gradient) !important;
}

.home .icon.heart path {
  stroke: none !important;
  fill: url(#icon-gradient) !important;
}
</style>