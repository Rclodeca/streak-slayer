<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Gem, Hourglass } from 'lucide-vue-next';
import { FREEZE, ITEM_CATALOG, addDaysToDayKey, daysBetweenDayKeys, formatDayKey, vaultWareState, vaultWindowKey } from '../../game-engine';
import type { ItemDef, VaultWare } from '../../game-engine';
import { useVault } from '../../composables/useVault';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import WardrobeSheet from '../character/WardrobeSheet.vue';
import SectionTitle from '../ui/SectionTitle.vue';
import FreezePicker from './FreezePicker.vue';
import ShopFeatured from './ShopFeatured.vue';
import ShopWareRow from './ShopWareRow.vue';

// The Vault side (docs/mockups/shop-tab-2.html, A): its piece on velvet, then
// what's kept for good (the streak freeze) and what's only for this run (a
// rare, the Gold Pouch). Everything is bought with gems. Draws a new stock
// whenever the one on hand isn't this window's: first open, every 3 days, and
// a new run after a death.
const characterStore = useCharacterStore();
const accountStore = useAccountStore();
const habitStore = useHabitStore();
const vault = useVault();

watch(
  () => characterStore.character.vault?.windowKey !== vaultWindowKey(vault.todayKey.value),
  (stale) => {
    if (stale) vault.ensureStock();
  },
  { immediate: true },
);

const LABELS = { sold: 'Sold', owned: 'Owned' } as const;

function itemOf(ware: VaultWare): ItemDef | undefined {
  return ITEM_CATALOG.find((item) => item.id === ware.itemId);
}

/** The button a Vault item shows. */
function wareView(ware: VaultWare) {
  const state = vaultWareState(characterStore.character, accountStore.account.gems, ware);
  return {
    buyable: state === 'buy',
    short: state === 'short',
    label: state === 'sold' || state === 'owned' ? LABELS[state] : undefined,
  };
}

const featured = computed(() => {
  const ware = vault.stock.value?.featured;
  const item = ware && itemOf(ware);
  return ware && item ? { ware, item, ribbon: `Vault ${item.rarity}`, ...wareView(ware) } : null;
});
const wares = computed(() =>
  (vault.stock.value?.wares ?? []).flatMap((ware) => {
    const item = itemOf(ware);
    return item ? [{ ware, item, ...wareView(ware) }] : [];
  }),
);

const pouch = computed(() => {
  const state = vault.pouch.value;
  return { ...state, text: `${state.gold.toLocaleString('en-US')} gold, now. Once a day.`, label: state.status === 'cooldown' ? 'Tomorrow' : undefined };
});

// The streak freeze: bought for one skill in a picker. The soonest freeze
// ahead is shown under the row, e.g. "Read: Nov 20 – Nov 24 · +1 more".
const freezeOpen = ref(false);
const frozenAhead = computed(() => {
  const runs = habitStore.habits.flatMap((habit) => {
    const ahead = (habit.frozenDayKeys ?? []).filter((key) => daysBetweenDayKeys(vault.todayKey.value, key) >= 0);
    if (ahead.length === 0) return [];
    let end = ahead[0];
    for (const key of ahead.slice(1)) {
      if (key !== addDaysToDayKey(end, 1)) break;
      end = key;
    }
    return [{ name: habit.name, start: ahead[0], end }];
  });
  if (runs.length === 0) return undefined;
  const soonest = runs.reduce((a, b) => (b.start < a.start ? b : a));
  const span = soonest.end === soonest.start ? formatDayKey(soonest.start) : `${formatDayKey(soonest.start)} – ${formatDayKey(soonest.end)}`;
  return `${soonest.name}: ${span}${runs.length > 1 ? ` · +${runs.length - 1} more` : ''}`;
});
const freezeShort = computed(() => accountStore.account.gems < FREEZE.gemsPerPeriod);

// Skins are bought and worn in the wardrobe, the same sheet the Hero tab's home base opens.
const wardrobeOpen = ref(false);
</script>

<template>
  <div class="shop-wares vault-wares">
    <ShopFeatured
      v-if="featured"
      :item="featured.item"
      :price="featured.ware.gems"
      :buyable="featured.buyable"
      :short="featured.short"
      :label="featured.label"
      :ribbon="featured.ribbon"
      keep="Lost when you fall"
      currency="gems"
      @buy="vault.buy(featured.item.id)"
    />

    <SectionTitle title="For good" aside="Never lost"><Gem :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        kind="tonic"
        name="Streak Freeze"
        icon="freeze"
        text="One skill rests on the days you pick. Its streak holds, but doesn't grow."
        :price="FREEZE.gemsPerPeriod"
        :buyable="!freezeShort"
        :short="freezeShort"
        :warn="frozenAhead"
        currency="gems"
        @buy="freezeOpen = true"
      />
      <ShopWareRow
        kind="tonic"
        name="Skins"
        icon="skins"
        text="New looks for your hero, home and arena."
        :price="0"
        :buyable="true"
        label="Browse"
        currency="gems"
        @buy="wardrobeOpen = true"
      />
    </div>
    <FreezePicker v-if="freezeOpen" v-model="freezeOpen" />
    <WardrobeSheet v-model="wardrobeOpen" />

    <SectionTitle title="For this run" aside="Lost when you fall"><Hourglass :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        v-for="row in wares"
        :key="row.ware.itemId"
        kind="item"
        :name="row.item.name"
        :item="row.item"
        :price="row.ware.gems"
        :buyable="row.buyable"
        :short="row.short"
        :label="row.label"
        currency="gems"
        @buy="vault.buy(row.item.id)"
      />
      <ShopWareRow
        kind="tonic"
        name="Gold Pouch"
        icon="gold"
        :text="pouch.text"
        :price="pouch.gems"
        :buyable="pouch.status === 'buy'"
        :short="pouch.status === 'short'"
        :label="pouch.label"
        currency="gems"
        @buy="vault.buyPouch()"
      />
    </div>

    <p class="shop-note">New wares every 3 days, and when you fall.</p>
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.shop-wares,
.shop-rows {
  display: flex;
  flex-direction: column;
}

.shop-wares {
  gap: 12px;
}

.shop-rows {
  gap: 6px;
}

.shop-note {
  margin: 0;
  text-align: center;
}
</style>
