<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { HandCoins } from 'lucide-vue-next';
import { FREEZE, MAX_EQUIP_SLOTS, SERVICE_DEFS, addDaysToDayKey, daysBetweenDayKeys, formatDayKey, maxEquipSlots } from '../../game-engine';
import { useServices } from '../../composables/useServices';
import { useVault } from '../../composables/useVault';
import { useAccountStore } from '../../store/accountStore';
import { useCharacterStore } from '../../store/characterStore';
import { useHabitStore } from '../../store/habitStore';
import SectionTitle from '../ui/SectionTitle.vue';
import FreezePicker from './FreezePicker.vue';
import ShopServiceCard from './ShopServiceCard.vue';
import ShopServicePicker from './ShopServicePicker.vue';
import ShopWareRow from './ShopWareRow.vue';

// The Services side (docs/mockups/services-rotation.html): work done at once,
// to a skill, a worn item or the hero. One gold service on offer for each
// 3-day turn (Item slots, Overdrive, Reroll, Enchant) on a big card with its
// scene, the next one peeking out under it; below, the streak freeze and the
// Gold Pouch for gems, always there, each with its round seal
// (docs/mockups/services-art.html, B). The turn is put on the character when
// the side opens, a turn runs out (or the dev Skip day) and on a new run.
const accountStore = useAccountStore();
const characterStore = useCharacterStore();
const habitStore = useHabitStore();
const services = useServices();
const vault = useVault();

watch(
  () => characterStore.character.serviceTurn !== services.turn.value,
  (stale) => {
    if (stale) services.ensureTurn();
  },
  { immediate: true },
);

// A slot buys in one tap, the others ask for a target first.
const SERVICE_LABELS = { none: { reroll: 'No skills', overdrive: 'No skills', enchant: 'Nothing worn', slot: '' }, maxed: 'Full' } as const;
const pickerService = ref<'reroll' | 'overdrive' | 'enchant' | null>(null);
const pickerOpen = computed({
  get: () => pickerService.value !== null,
  set: (open) => {
    if (!open) pickerService.value = null;
  },
});

const defOf = (id: string) => SERVICE_DEFS.find((def) => def.id === id)!;
const card = computed(() => {
  const def = defOf(services.turn.value.id);
  const state = services.state(def.id);
  const label = state.status === 'none' ? SERVICE_LABELS.none[def.id] : state.status === 'maxed' ? SERVICE_LABELS.maxed : undefined;
  const next = defOf(services.next.value);
  const slots = maxEquipSlots(characterStore.character);
  const change = def.id === 'slot' && slots < MAX_EQUIP_SLOTS ? `${slots} → ${slots + 1} slots` : undefined;
  return {
    ...def,
    price: state.price,
    buyable: state.status === 'buy',
    short: state.status === 'short',
    label,
    next: { id: next.id, name: next.name },
    change,
  };
});

function onService() {
  const id = card.value.id;
  if (id === 'slot') services.buySlot();
  else pickerService.value = id;
}

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

const pouch = computed(() => {
  const state = vault.pouch.value;
  return { ...state, text: `${state.gold.toLocaleString('en-US')} gold, now. Once a day.`, label: state.status === 'cooldown' ? 'Tomorrow' : undefined };
});
</script>

<template>
  <div class="shop-wares">
    <ShopServiceCard
      :id="card.id"
      :name="card.name"
      :text="card.effect"
      :price="card.price"
      :buyable="card.buyable"
      :short="card.short"
      :label="card.label"
      :days-left="services.daysLeft.value"
      :next="card.next"
      :change="card.change"
      @buy="onService"
    />

    <SectionTitle title="Services"><HandCoins :size="20" class="section-icon" /></SectionTitle>
    <div class="shop-rows">
      <ShopWareRow
        kind="service"
        name="Streak Freeze"
        art="services/freeze"
        text="One skill rests on the days you pick. Its streak holds, but doesn't grow."
        :price="FREEZE.gemsPerPeriod"
        :buyable="!freezeShort"
        :short="freezeShort"
        :warn="frozenAhead"
        currency="gems"
        @buy="freezeOpen = true"
      />
      <ShopWareRow
        kind="service"
        name="Gold Pouch"
        art="services/pouch"
        :text="pouch.text"
        :price="pouch.gems"
        :buyable="pouch.status === 'buy'"
        :short="pouch.status === 'short'"
        :label="pouch.label"
        currency="gems"
        @buy="vault.buyPouch()"
      />
    </div>
    <ShopServicePicker v-if="pickerService" v-model="pickerOpen" :service="pickerService" />
    <FreezePicker v-if="freezeOpen" v-model="freezeOpen" />
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
</style>
