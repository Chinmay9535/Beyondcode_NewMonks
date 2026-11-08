const { chromium, devices } = require('playwright');
// Browser smoke test of the main journeys against a fresh, seeded database.
// Usage: node scripts/e2e-smoke.cjs [screenshot-dir]   (needs `playwright` and both servers running)
const OUT = process.argv[2];
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const shot = (pg, name, full) => OUT ? pg.screenshot({ path: OUT + '/' + name, fullPage: !!full }) : null;
(async () => {
  const b = await chromium.launch();
  const errs = [];
  const watch = (p, tag) => { p.on('pageerror', e => errs.push(tag + ' pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errs.push(tag + ' console: ' + m.text()); }); };

  // ---------- Patient: Ramesh (Kannada), on a phone
  const phone = await b.newContext({ ...devices['Pixel 7'] });
  const p = await phone.newPage(); watch(p, 'ramesh');
  await p.goto(BASE + '/p/RAMESH');
  await p.getByRole('button', { name: /ಒಪ್ಪುತ್ತೇನೆ/ }).click();
  await p.waitForSelector('text=ನಮಸ್ಕಾರ');
  const input = p.getByRole('textbox');
  const send = async (t) => { await input.fill(t); await input.press('Enter'); await p.waitForTimeout(700); };
  await send('ನಾನು ಟೈಲರ್. ಸೂಜಿಗೆ ದಾರ ಪೋಣಿಸಬೇಕು, ರಾತ್ರಿ ಸ್ಕೂಟರ್ ಓಡಿಸುತ್ತೇನೆ.');
  await shot(p, '1-ramesh-chat.png');
  await send('ಇಲ್ಲ');                        // mid topic
  await p.getByRole('button', { name: 'ತುಂಬಾ ಮುಖ್ಯ' }).click(); await p.waitForTimeout(700);   // glasses chip
  await p.getByRole('button', { name: 'ಮಧ್ಯಮ' }).click(); await p.waitForTimeout(900);          // budget chip
  await p.waitForSelector('text=ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡ ನಿಮ್ಮ ದಿನಚರಿ');
  await shot(p, '2-ramesh-done.png', true);

  // ---------- Patient: Abdul (Hindi), recovery + red flag
  const a = await phone.newPage(); watch(a, 'abdul');
  await a.goto(BASE + '/p/ABDUL');
  await a.waitForSelector('text=आज की ड्रॉप्स');
  await shot(a, '3-abdul-recovery.png', true);
  await a.getByRole('button', { name: /पूछें/ }).click();
  const ai = a.getByRole('textbox'); await ai.fill('मैं कब नहा सकता हूँ?'); await ai.press('Enter'); await a.waitForTimeout(800);
  await ai.fill('अचानक बहुत दर्द और कुछ नहीं दिख रहा'); await ai.press('Enter'); await a.waitForTimeout(900);
  await shot(a, '4-abdul-ask.png', true);
  await a.getByRole('button', { name: /मेरा लेंस/ }).click(); await a.waitForTimeout(2500);
  await shot(a, '5-abdul-lens.png', true);

  // ---------- Staff: desktop
  const desk = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const s = await desk.newPage(); watch(s, 'staff');
  await s.goto(BASE + '/staff');
  await s.getByLabel('PIN').fill('2468'); await s.getByRole('button', { name: 'Sign in' }).click();
  await s.waitForSelector('text=Abdul Rahim');
  await s.waitForTimeout(600);
  await shot(s, '6-staff-dashboard.png', true);
  await s.goto(BASE + '/staff/RAMESH');
  await s.waitForSelector('text=Recommended plan');
  await s.waitForTimeout(800);
  await shot(s, '7-staff-ramesh.png', true);
  await s.getByRole('button', { name: /^Approve / }).click(); await s.waitForTimeout(800);
  const txt = await s.textContent('body');
  console.log('approved shown:', /The patient now sees it/.test(txt));

  // Ramesh sees the approved lens
  await p.reload(); await p.getByRole('button', { name: /ನನ್ನ ಲೆನ್ಸ್/ }).click(); await p.waitForTimeout(2500);
  await shot(p, '8-ramesh-lens.png', true);

  // Safety scorecard: live triage
  const sf = await desk.newPage(); watch(sf, 'safety');
  await sf.goto(BASE + '/safety'); await sf.waitForSelector('text=Try it');
  await sf.getByPlaceholder(/ಕಣ್ಣು/).fill('aankh lal hai aur dard badh raha hai'); await sf.getByRole('button', { name: 'Triage' }).click();
  await sf.waitForSelector('text=Urgent: surgeon alerted');
  await shot(sf, '9-safety.png', true);
  console.log('safety triage ok');

  // Eye test: Abdul taps "can't see" -> worse than his last post-op result -> urgent alert
  await a.getByRole('button', { name: 'आँख जाँच' }).click();
  await a.getByRole('button', { name: /दूर की नज़र/ }).click();
  await a.getByRole('button', { name: 'बराबर है' }).click();
  await a.getByRole('button', { name: /शुरू करें/ }).click();
  while (await a.locator('svg[aria-label="E"]').count()) { await a.getByRole('button', { name: 'नहीं दिख रहा' }).click(); await a.waitForTimeout(150); }
  await a.waitForSelector('text=आपका नतीजा');
  await a.waitForSelector('text=डॉक्टर');
  await shot(a, '10-abdul-eyetest.png', true);
  console.log('eye test drop alert ok');

  // Second eye: plan Abdul's left eye from the right eye's real outcome
  await s.goto(BASE + '/staff/ABDUL'); await s.getByRole('tab', { name: /Eyes/ }).click(); await s.waitForSelector('text=Plan second eye');
  await s.getByPlaceholder('e.g. -0.50').fill('-0.50'); await s.getByRole('button', { name: 'Plan second eye' }).click();
  await s.waitForTimeout(800); await s.getByRole('tab', { name: /Overview/ }).click();
  await s.waitForSelector('text=Second-eye refinement');
  await s.waitForSelector('text=vision drop');
  await shot(s, '11-abdul-second-eye.png', true);
  console.log('second eye ok');

  // Landing
  const l = await desk.newPage(); watch(l, 'landing'); await l.goto(BASE + '/'); await l.waitForTimeout(800);
  await shot(l, '0-landing.png');
  console.log('errors:', errs.length ? errs : 'none');
  if (errs.length) process.exitCode = 1;
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
