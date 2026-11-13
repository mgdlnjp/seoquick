import { Layout } from './components/Layout';
import { BillingReturnPage } from './pages/BillingReturnPage';
import { HomePage } from './pages/HomePage';
import { LegalNoticePage, NotFoundPage, PrivacyPage } from './pages/LegalPages';
import type { RouteMeta } from './routes';

/** Routage minimal : chaque page est pré-rendue en HTML statique, la navigation recharge la page. */
export function App({ path }: { path: RouteMeta['path'] | null }) {
  let page;
  switch (path) {
    case '/':
      page = <HomePage />;
      break;
    case '/confidentialite/':
      page = <PrivacyPage />;
      break;
    case '/mentions-legales/':
      page = <LegalNoticePage />;
      break;
    case '/abonnement/':
      page = <BillingReturnPage />;
      break;
    default:
      page = <NotFoundPage />;
  }
  return <Layout>{page}</Layout>;
}
