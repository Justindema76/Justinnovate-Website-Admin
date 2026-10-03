import assert from 'node:assert/strict';
import test from 'node:test';
import { getSite, listSites, SITE_KEYS } from '../api/_shared/siteRegistry.js';

test('exactly three websites are registered', () => {
  const sites = listSites();
  assert.equal(sites.length, 3);
  assert.deepEqual(
    sites.map(site => site.key).sort(),
    [SITE_KEYS.JUSTIN, SITE_KEYS.JUSTCONSIGNIN, SITE_KEYS.SUNWINGS].sort(),
  );
});

test('Justin and JustConsignIn have separate feature ownership', () => {
  const justin = getSite(SITE_KEYS.JUSTIN);
  const consign = getSite(SITE_KEYS.JUSTCONSIGNIN);

  assert.ok(justin.features.includes('service-requests'));
  assert.ok(justin.features.includes('hiring-contacts'));
  assert.ok(!consign.features.includes('service-requests'));
  assert.ok(!consign.features.includes('hiring-contacts'));

  assert.ok(consign.features.includes('demo-requests'));
  assert.ok(consign.features.includes('beta-partners'));
  assert.ok(!justin.features.includes('demo-requests'));
  assert.ok(!justin.features.includes('beta-partners'));
});

test('Sunwings owns only its transport website workflows', () => {
  const sunwings = getSite(SITE_KEYS.SUNWINGS);
  const justin = getSite(SITE_KEYS.JUSTIN);
  const consign = getSite(SITE_KEYS.JUSTCONSIGNIN);

  for (const feature of ['services','locations','quote-requests']) {
    assert.ok(sunwings.features.includes(feature));
    assert.ok(!justin.features.includes(feature));
    assert.ok(!consign.features.includes(feature));
  }

  assert.ok(!sunwings.features.includes('service-requests'));
  assert.ok(!sunwings.features.includes('demo-requests'));
  assert.ok(!sunwings.features.includes('metricool'));
});

test('JustConsignIn-only automation never appears on Justin or Sunwings', () => {
  const justin = getSite(SITE_KEYS.JUSTIN);
  const consign = getSite(SITE_KEYS.JUSTCONSIGNIN);
  const sunwings = getSite(SITE_KEYS.SUNWINGS);

  assert.ok(consign.features.includes('social-automation'));
  assert.ok(consign.features.includes('metricool'));
  assert.ok(!justin.features.includes('social-automation'));
  assert.ok(!justin.features.includes('metricool'));
  assert.ok(!sunwings.features.includes('social-automation'));
  assert.ok(!sunwings.features.includes('metricool'));
});

test('Justin-only project and recruitment workflows stay isolated', () => {
  const justin = getSite(SITE_KEYS.JUSTIN);
  const consign = getSite(SITE_KEYS.JUSTCONSIGNIN);
  const sunwings = getSite(SITE_KEYS.SUNWINGS);

  for (const feature of ['service-requests','service-request-emails','departments','hiring-contacts']) {
    assert.ok(justin.features.includes(feature));
    assert.ok(!consign.features.includes(feature));
    assert.ok(!sunwings.features.includes(feature));
  }
});
