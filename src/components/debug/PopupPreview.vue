<script setup lang="ts">
import { computed } from 'vue';
import { BOSS_ART_COUNT, bossArt, bossFamily, createHabit, createQuest, createRng } from '../../game-engine';
import type { BossFamily, Personality } from '../../game-engine';
import { useBossSkillCard } from '../../composables/useBossSkillCard';
import { useCelebration } from '../../composables/useCelebration';
import { useDeathScreen } from '../../composables/useDeathScreen';
import { useMissedSkillsGate } from '../../composables/useMissedSkillsGate';
import { useQuestCompleteQueue } from '../../composables/useQuestCompleteQueue';
import { useQuestMissGate } from '../../composables/useQuestMissGate';
import { useBossStore } from '../../store/bossStore';
import { useCharacterStore } from '../../store/characterStore';
import { useDebugBackdropStore } from '../../store/debugBackdropStore';
import { useDebugTrialsBadgeStore } from '../../store/debugTrialsBadgeStore';

const { enqueue } = useQuestCompleteQueue();
const { queueMiss } = useQuestMissGate();
const missedSkills = useMissedSkillsGate();
const { triggerDeath } = useDeathScreen();
const { celebrateBossKill, celebrateLevelUp } = useCelebration();
const { showBossSkill } = useBossSkillCard();
const bossStore = useBossStore();
const characterStore = useCharacterStore();
const trialsBadge = useDebugTrialsBadgeStore();
const backdrop = useDebugBackdropStore();

// Fake quests/habits never enter their stores, so acknowledging a preview is
// a no-op (the resolvers all bail on an unknown id).
function previewComplete() {
  const quest = createQuest('Clean the garage', 'hard', '2099-01-01');
  enqueue({ description: quest.description, difficulty: quest.difficulty, amount: 80 });
}

function previewMiss() {
  queueMiss(createQuest('Clean the garage', 'hard', '2026-01-01'));
  queueMiss(createQuest('File the taxes', 'easy', '2026-01-02'));
}

// Plays the current boss's death and its own return, then the hero's last
// level-up again; neither store changes.
function previewKill() {
  celebrateBossKill({ ...bossStore.boss, health: 0 }, bossStore.boss);
  celebrateLevelUp(Math.max(1, characterStore.character.level - 1));
}

// Puts the tallest boss image (warlord 5, 90 art px) on the stage, to check how tall bosses fit.
function showTallestBoss() {
  bossStore.setBoss({ ...bossStore.boss, personality: 'warlord', art: 4 });
}

// The warlord whose raised sword reaches the stage's menu button (warlord 1, 84 art px).
function showSwordWarlord() {
  bossStore.setBoss({ ...bossStore.boss, personality: 'warlord', art: 0 });
}

// The armored dark knights (armored 1-4), the next one on each press.
function showNextKnight() {
  const boss = bossStore.boss;
  const art = bossFamily(boss.personality) === 'armored' ? (bossArt(boss) + 1) % BOSS_ART_COUNT.armored : 0;
  bossStore.setBoss({ ...boss, personality: 'armored', art });
}

// Every boss image in turn, family by family (the common tier of each), the next
// one on each press: all of the roster's art, to see a backdrop behind each.
const FAMILY_PERSONALITY: Record<BossFamily, Personality> = {
  drifter: 'balanced',
  colossus: 'tank',
  armored: 'armored',
  warded: 'warded',
  brute: 'brute',
  arcane: 'arcane',
  warlord: 'warlord',
  dragon: 'dragon',
  serpent: 'serpent',
  wraith: 'wraith',
};
const ALL_BOSS_ART = (Object.keys(BOSS_ART_COUNT) as BossFamily[]).flatMap((family) =>
  Array.from({ length: BOSS_ART_COUNT[family] }, (_, art) => ({ family, art })),
);
const bossArtPosition = computed(() => {
  const boss = bossStore.boss;
  return ALL_BOSS_ART.findIndex((e) => e.family === bossFamily(boss.personality) && e.art === bossArt(boss));
});

function showNextBoss() {
  const next = ALL_BOSS_ART[(bossArtPosition.value + 1) % ALL_BOSS_ART.length];
  bossStore.setBoss({ ...bossStore.boss, personality: FAMILY_PERSONALITY[next.family], art: next.art });
}

function previewBossSkills() {
  showBossSkill({ skill: 'ravage', outcome: 'landed', amount: 1240 });
  showBossSkill({ skill: 'blind', outcome: 'landed' });
  showBossSkill({ skill: 'doom', outcome: 'landed', pct: 50 });
  showBossSkill({ skill: 'empower', outcome: 'landed', stat: 'armor' });
  showBossSkill({ skill: 'ascend', outcome: 'landed' });
  showBossSkill({ skill: 'rend', outcome: 'failed' });
}

function previewDaily() {
  const rng = createRng();
  missedSkills.queueMiss(createHabit('Meditate', 'daily', 'medium', false, rng), 'preview');
  missedSkills.queueMiss(createHabit('Read a chapter', 'weekly', 'hard', false, rng), 'preview');
  missedSkills.queueReward(createHabit('Skip dessert', 'daily', 'easy', true, rng), 'preview');
}
</script>

<template>
  <div class="preview">
    <button type="button" @click="previewComplete">Preview quest complete (testing)</button>
    <button type="button" @click="previewDaily">Preview daily update (testing)</button>
    <button type="button" @click="previewMiss">Preview quest failed (testing)</button>
    <button type="button" @click="triggerDeath">Preview death screen (testing)</button>
    <button type="button" @click="previewKill">Preview boss kill (testing)</button>
    <button type="button" @click="previewBossSkills">Preview boss skills (testing)</button>
    <button type="button" @click="showTallestBoss">Show tallest boss (testing)</button>
    <button type="button" @click="showSwordWarlord">Show sword warlord (testing)</button>
    <button type="button" @click="showNextKnight">Show next dark knight (testing)</button>
    <button type="button" @click="showNextBoss">Next boss {{ bossArtPosition + 1 }}/{{ ALL_BOSS_ART.length }} (testing)</button>
    <button type="button" @click="backdrop.toggleStage()">Stage backdrop: {{ backdrop.stage }} (testing)</button>
    <button type="button" @click="backdrop.toggleHome()">Hero tab backdrop: {{ backdrop.home }} (testing)</button>
    <button type="button" @click="trialsBadge.set(null, true)">Trials dot (testing)</button>
    <button type="button" @click="trialsBadge.set(3, null)">Trials 3 (testing)</button>
    <button type="button" @click="trialsBadge.set(12, null)">Trials 12 (testing)</button>
    <button type="button" @click="trialsBadge.set(0, false)">Trials none (testing)</button>
    <button type="button" @click="trialsBadge.set(null, null)">Trials real (testing)</button>
  </div>
</template>

<style scoped>
.preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-self: flex-start;
}

button {
  font-size: 0.8em;
  opacity: 0.7;
  border: 1px dashed var(--border);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.6rem;
}

button:hover {
  opacity: 1;
}
</style>
