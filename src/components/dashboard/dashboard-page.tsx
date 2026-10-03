import { UserDashboard } from './user-dashboard';
import { UiLanguageProvider } from '../ui-language';
import { dashboardView } from '@/lib/dashboard';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getDashboardMessages } from '@/lib/i18n/dashboard-dictionaries';
import { languagePath, type Locale } from '@/lib/i18n/config';
import { translator } from '@/lib/i18n/translate';
import { pageMetadata } from '@/lib/seo';

export type DashboardPageProps = {
  searchParams: Promise<{ view?: string; notice?: string; checkout?: string }>;
};

// oxlint-disable-next-line react/only-export-components -- Shared private route metadata.
export async function dashboardMetadata(locale: Locale) {
  const tr = translator(await getDashboardMessages(locale));
  return pageMetadata(
    tr('Your dashboard'),
    tr('Your private Folio files and saved links, billing, account settings, and support.'),
    languagePath(locale, '/dashboard'),
    false,
  );
}

export async function DashboardPage({
  locale = 'en',
  searchParams,
}: DashboardPageProps & { locale?: Locale }) {
  const [query, dictionary, messages] = await Promise.all([
    searchParams,
    getDictionary(locale),
    getDashboardMessages(locale),
  ]);
  return (
    <UiLanguageProvider locale={locale} messages={{ ...dictionary.ui, ...messages }}>
      <UserDashboard
        view={dashboardView(query.view)}
        adminRequired={query.notice === 'admin-required'}
        checkoutSuccess={query.checkout === 'success'}
      />
    </UiLanguageProvider>
  );
}
