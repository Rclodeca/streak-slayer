<script setup lang="ts">
// A section's title as a banner (docs/mockups/pixel-banners.html, option B):
// the name on a pixel pennant dyed the section's colour, pinned by a
// medallion holding the slot (the section's icon, or the hero's portrait).
// The look is in themes/ashen.scss.
defineProps<{ title: string }>();
</script>

<template>
  <h2 class="section-title">
    <span class="medal" aria-hidden="true"><slot /></span>
    <span class="cloth">{{ title }}</span>
  </h2>
</template>
