import { themeCheckRun } from '@shopify/theme-check-node';
const { offenses } = await themeCheckRun(process.argv[2]);
// Solo interesan los archivos del paquete: el resto es Horizon tal cual viene.
const mios = offenses.filter(o => /\/(sh-[a-z-]+\.(liquid|css|js)|index\.squishy-heaven\.json|page\.envios-y-cambios\.json)$/.test(o.uri));
console.log(`ofensas totales del tema entero: ${offenses.length} · en archivos del paquete: ${mios.length}`);
for (const o of mios) {
  const sev = ['ERROR','WARN','INFO'][o.severity] ?? o.severity;
  console.log(`${sev} ${o.uri.split('/').slice(-2).join('/')}:${o.start.line+1} [${o.check}] ${o.message}`);
}
