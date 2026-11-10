<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { TALENT_DEFS, TALENT_SHOOTS, talentPointsInShoot, talentRank } from '../../game-engine';
import type { TalentDef, TalentShoot } from '../../game-engine';
import { useCharacterStore } from '../../store/characterStore';
import { useTabStore } from '../../store/tabStore';
import TalentCell from './TalentCell.vue';
import TalentNodeModal from './TalentNodeModal.vue';
import { SHOOT_LOOK, talentState } from './talentDisplay';

// The tree itself (docs/mockups/pixel-talents.html, Plinths): the hero's tree for
// this run, one shoot at a time. The shoot's trunk grows up from its first node to
// its ★ with the offshoots to either side, turning brass up to the nodes with
// ranks. Three plinths at the foot pick the shoot, in thumb reach. It opens
// scrolled to the bottom, the first node. Tapping a node opens its popup
// (TalentNodeModal). TalentSection puts it on the page on a phone, in a modal on
// a wider screen.
const characterStore = useCharacterStore();
const tabStore = useTabStore();
const character = computed(() => characterStore.character);

/** The shoot shown first: the one with the most points spent, Damage on a tie. */
function busiestShoot(): TalentShoot {
  return TALENT_SHOOTS.reduce((best, shoot) => (talentPointsInShoot(character.value, shoot) > talentPointsInShoot(character.value, best) ? shoot : best));
}
const shoot = ref<TalentShoot>(busiestShoot());
const selected = ref<TalentDef | null>(null);

const stateOf = (def: TalentDef) => talentState(character.value, def);

interface Row {
  node: TalentDef;
  /** Offshoots to the right and to the left of the trunk. */
  right?: TalentDef;
  left?: TalentDef;
  /** Whether a trunk runs on above this node (every node but the ★). */
  hasUp: boolean;
  /** The trunk's half above this node is brass when the node above has a rank; the half below when this one has. */
  litUp: boolean;
  litDown: boolean;
  /** The branches are brass once the main node they hang off has a rank. */
  litBranch: boolean;
}

/**
 * The shoot's rows from the ★ down to its first node. A lone offshoot alternates
 * sides up the trunk, starting on the right; a pair takes both sides.
 */
const rows = computed<Row[]>(() => {
  const defs = TALENT_DEFS.filter((def) => def.shoot === shoot.value);
  const climb = [...defs.filter((def) => def.kind === 'main'), ...defs.filter((def) => def.kind === 'top')];
  const ranked = (def: TalentDef) => talentRank(character.value, def.id) > 0;
  let lone = 0;
  return climb
    .map((node, i): Row => {
      const offs = defs.filter((def) => def.parent === node.id);
      let right: TalentDef | undefined = offs[0];
      let left: TalentDef | undefined = offs[1];
      if (offs.length === 1) [right, left] = lone++ % 2 === 0 ? [offs[0], undefined] : [undefined, offs[0]];
      const above = climb[i + 1];
      return { node, right, left, hasUp: above !== undefined, litUp: above !== undefined && ranked(above), litDown: ranked(node), litBranch: ranked(node) };
    })
    .reverse();
});

function pick(next: TalentShoot) {
  shoot.value = next;
}

// The tree opens at the bottom: the first node, and the plinth it grows from.
const tree = ref<HTMLElement | null>(null);
function scrollToBottom() {
  // On a phone the tree scrolls itself; in the modal, the modal's body does.
  for (const box of [tree.value, tree.value?.closest<HTMLElement>('.modal-scroll')]) if (box) box.scrollTop = box.scrollHeight;
}
onMounted(scrollToBottom);
watch([shoot, () => tabStore.tab], () => nextTick(scrollToBottom));

/** Where the brass root meets each plinth along the 366-wide drawing: a sixth, a half and five sixths across. */
const ROOT_X: Record<TalentShoot, number> = { damage: 61, tank: 183, support: 305 };
</script>

<template>
  <div class="talent-tree-view">
    <div ref="tree" class="talent-tree">
      <div class="trunk">
        <div v-for="row in rows" :key="row.node.id" class="trunk-row">
          <span v-if="row.hasUp" class="seg up" :class="{ lit: row.litUp }" />
          <span class="seg down" :class="{ lit: row.litDown }" />
          <template v-for="side in (['left', 'right'] as const)" :key="side">
            <template v-if="row[side]">
              <span class="br" :class="[side === 'right' ? 'r' : 'l', { lit: row.litBranch }]" />
              <TalentCell
                :def="row[side]!"
                :state="stateOf(row[side]!)"
                :rank="talentRank(character, row[side]!.id)"
                :place="side === 'right' ? 'rgt' : 'lft'"
                @pick="selected = row[side]!"
              />
            </template>
          </template>
          <TalentCell :def="row.node" :state="stateOf(row.node)" :rank="talentRank(character, row.node.id)" place="mid" @pick="selected = row.node" />
        </div>
      </div>
    </div>

    <div class="talent-foot">
      <svg class="stand" viewBox="0 0 366 18" preserveAspectRatio="none" aria-hidden="true">
        <path :d="`M183 0 V8 H${ROOT_X[shoot]} V18`" fill="none" stroke-width="4" vector-effect="non-scaling-stroke" />
      </svg>
      <div class="plinths" role="group" aria-label="Shoots">
        <button
          v-for="id in TALENT_SHOOTS"
          :key="id"
          type="button"
          class="pl"
          :class="{ on: id === shoot }"
          :style="{ '--c': SHOOT_LOOK[id].color }"
          :aria-pressed="id === shoot"
          @click="pick(id)"
        >
          <span class="pl-name"><component :is="SHOOT_LOOK[id].icon" :size="14" aria-hidden="true" />{{ SHOOT_LOOK[id].name }}</span>
          <b>{{ talentPointsInShoot(character, id) }} spent</b>
        </button>
      </div>
    </div>
    <TalentNodeModal :def="selected" @close="selected = null" />
  </div>
</template>

<style scoped>
/* Base layout only; the Pixel-cut look is in themes/ashen.scss. */
.talent-tree-view {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.trunk {
  max-width: 420px;
  margin: 0 auto;
  padding: 4px 0 8px;
}

/* A node a row, the trunk behind it in two halves and any offshoots to the sides. */
.trunk-row {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 96px 1fr;
}

.seg {
  position: absolute;
  left: 50%;
  z-index: 0;
  width: 4px;
  margin-left: -2px;
  height: 50%;
}

.seg.up {
  top: 0;
}

.seg.down {
  bottom: 0;
}

.br {
  position: absolute;
  top: 31px;
  z-index: 0;
  height: 3px;
}

.br.r {
  left: calc(50% + 26px);
  width: calc((100% - 96px) / 4);
}

.br.l {
  right: calc(50% + 26px);
  width: calc((100% - 96px) / 4);
}

.talent-foot {
  position: relative;
}

.stand {
  display: block;
  width: 100%;
  height: 18px;
  overflow: visible;
}

.plinths {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  align-items: end;
}

.pl {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-height: 50px;
  padding: 0;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.pl.on {
  min-height: 64px;
}

.pl-name {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Only the tree scrolls, so the plinths stay in reach: in the modal on a wide
   screen it stops at a share of the window; on a phone the banner and plinths
   stay put and it fills what they leave (AppShell hands the tab the whole box). */
.talent-tree {
  max-height: 60vh;
  overflow-y: auto;
  scrollbar-width: none;
}

@media (max-width: 820px) {
  .talent-tree {
    flex: 1;
    min-height: 0;
    max-height: none;
  }
}
</style>
