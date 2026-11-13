import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BILLING_URLS, billingErrorBody, createApp } from './app';
import { createBillingContext, loadBillingSettings, loadFreePerDay } from './billing';
import { loadConfig } from './config';

const config = loadConfig();
const here = path.dirname(fileURLToPath(import.meta.url));
// En production le bundle est dans dist-server/, le front dans dist/.
const staticDir = config.serveStatic ? path.resolve(here, '..', 'dist') : undefined;

const billingSettings = loadBillingSettings();
const billing = createBillingContext({
  settings: billingSettings,
  freePerDay: loadFreePerDay(),
  urls: BILLING_URLS,
  errorBody: billingErrorBody,
});

const app = createApp({ config, staticDir, billing });

app.listen(config.port, config.host, () => {
  console.log(`SEOQuick API sur http://${config.host}:${config.port}`);
  console.log(`  analyse d'URL réelles : ${config.enableLiveFetch ? 'activée' : 'DÉSACTIVÉE (mode démo seulement)'}`);
  if (staticDir) console.log(`  fichiers statiques : ${staticDir}`);
  console.log(
    `  abonnement Stripe : ${billingSettings ? `actif (${billing.freePerDay} analyses gratuites / 24 h)` : 'désactivé (accès libre)'}`,
  );
});
