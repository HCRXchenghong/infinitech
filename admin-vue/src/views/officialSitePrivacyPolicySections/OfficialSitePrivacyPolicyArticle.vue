<template>
  <article class="official-site-article official-site-privacy-policy-article">
    <section
      v-for="section in policySections"
      :key="section.title"
      class="official-site-privacy-policy-section"
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
      {{ policyNotice }}
    </div>
  </article>
</template>

<script setup>
defineProps({
  policyNotice: {
    type: String,
    required: true,
  },
  policySections: {
    type: Array,
    required: true,
  },
})
</script>
