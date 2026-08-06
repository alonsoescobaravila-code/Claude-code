import { themeCheckRun } from '@shopify/theme-check-node';
const { offenses } = await themeCheckRun(process.cwd() + '/theme');
const shown = offenses.filter(o => o.severity <= 1);
console.log('total:', offenses.length, '| errores+warnings:', shown.length);
for (const o of offenses) {
  const sev = ['ERROR','WARN','INFO'][o.severity] || o.severity;
  console.log(`${sev} ${o.uri.split('/theme/')[1]}:${o.start.line+1} [${o.check}] ${o.message}`);
}
