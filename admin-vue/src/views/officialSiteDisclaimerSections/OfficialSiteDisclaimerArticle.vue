<template>
  <article class="official-site-article official-site-disclaimer-article">
    <section
      v-for="section in disclaimerSections"
      :key="section.title"
      class="official-site-disclaimer-section"
    >
      <h2 class="h2-block">{{ section.title }}</h2>
      <p
        v-for="paragraph in section.paragraphs || []"
        :key="paragraph"
        class="p-block"
      >
        {{ paragraph }}
      </p>
      <ul
        v-if="Array.isArray(section.bullets) && section.bullets.length > 0"
        class="ul-block"
      >
        <li v-for="item in section.bullets" :key="item">{{ item }}</li>
      </ul>
    </section>

    <div class="quote-block">
      {{ disclaimerNotice }}
    </div>
  </article>
</template>

<script setup>
defineProps({
  disclaimerNotice: {
    type: String,
    required: true,
  },
  disclaimerSections: {
    type: Array,
    required: true,
  },
})
</script>
