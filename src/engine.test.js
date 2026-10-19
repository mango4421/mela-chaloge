import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {MelaEngine} from './engine.js';

function gameEngine(type, shots) {
  const engine = Object.create(MelaEngine.prototype);
  Object.assign(engine, {
    game: {type, shots, score: 0, busy: false, group: new THREE.Group(), balloons: []},
    stats: {balloons: 0, rings: 0, items: [], food: []},
    audio: {effect() {}, speak() {}}, events: {}, elapsed: 0,
    burst() {}, renderer: {domElement: {getBoundingClientRect: () => ({left: 0, top: 0, width: 100, height: 100})}},
    pointer: new THREE.Vector2(), camera: new THREE.PerspectiveCamera(),
    raycaster: {setFromCamera() {}, intersectObjects: objects => objects.length ? [{object: objects[0]}] : []}
  });
  return engine;
}

test('balloon round consumes three shots, excludes popped targets and awards one prize', () => {
  const engine = gameEngine('balloon', 3);
  engine.game.balloons = Array.from({length: 3}, () => new THREE.Object3D());
  for (let i = 0; i < 4; i++) engine.shoot({clientX: 50, clientY: 50});
  assert.equal(engine.game.shots, 0);
  assert.equal(engine.game.score, 3);
  assert.equal(engine.stats.balloons, 3);
  assert.deepEqual(engine.stats.items, ['Teddy prize']);
  assert(engine.game.balloons.every(balloon => !balloon.visible));
});

test('ring flight prevents extra throws and settles final score before reporting done', () => {
  const engine = gameEngine('ring', 1);
  const reports = [];
  engine.events.onGame = report => reports.push(report);
  engine.throwRing(0, -120);
  engine.throwRing(0, -120);
  assert.equal(engine.game.shots, 0);
  assert.equal(engine.game.group.children.length, 1);
  assert.equal(reports.at(-1).done, false);
  engine.elapsed = 1.1;
  engine.updateGame();
  engine.updateGame();
  assert.equal(engine.game.score, 1);
  assert.equal(engine.game.busy, false);
  assert.equal(reports.at(-1).done, true);
  assert.equal(engine.stats.rings, 1);
  assert.deepEqual(engine.stats.items, ['Ring toss trophy']);
});

test('cleanup removes and clears an in-flight game', () => {
  const engine = gameEngine('ring', 2);
  engine.scene = new THREE.Scene();
  engine.scene.add(engine.game.group);
  engine.throwRing(0, -120);
  engine.cleanupGame();
  assert.equal(engine.game, null);
  assert.equal(engine.scene.children.length, 0);
  assert.doesNotThrow(() => engine.updateGame());
});
