<script setup lang="ts">
// A section's title as a banner (docs/mockups/pixel-banners.html, option B):
// the name on a pixel pennant dyed the section's colour, pinned by a
// medallion holding the slot (the section's icon, or the hero's portrait). `aside`
// is a small count at the cloth's far end (the Hero tab's slots), where the cloth
// runs the page's full width.
// The look is in themes/ashen.scss.
defineProps<{ title: string; aside?: string }>();
</script>

<template>
  <h2 class="section-title">
    <span class="medal" aria-hidden="true"><slot /></span>
    <span class="cloth">{{ title }}<span v-if="aside" class="cloth-aside">{{ aside }}</span></span>
  </h2>
</template>
