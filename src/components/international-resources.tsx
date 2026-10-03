import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import * as about from './pages/about';
import * as account from './pages/account';
import * as pricing from './pages/pricing';
import * as convert from './pages/convert';
import * as forms from './pages/forms';
import * as privacy from './pages/privacy';
import * as terms from './pages/terms';
import * as security from './pages/security';
import * as support from './pages/support';
import * as maintenance from './pages/maintenance';
import * as guides from './pages/guides';
import * as guide from './pages/guides-article';
import * as blog from './pages/blog';
import * as article from './pages/blog-article';
import type { DirectoryParams } from '@/lib/tool-directory';
import { translator, localizedHref, type Messages } from '@/lib/i18n/translate';
import { languageAlternates, localeInfo, type Locale } from '@/lib/i18n/config';
import { siteUrl } from '@/lib/seo';

type Props = { locale: Locale; messages: Messages; searchParams: Promise<DirectoryParams> };

export async function InternationalResource({ path, ...props }: Props & { path: string }) {
  switch (path) {
    case '/about':
      return <about.default {...props} />;
    case '/account': {
      const query = await props.searchParams;
      return (
        <account.default
          {...props}
          searchParams={Promise.resolve({
            next: typeof query.next === 'string' ? query.next : undefined,
            notice: typeof query.notice === 'string' ? query.notice : undefined,
          })}
        />
      );
    }
    case '/pricing':
      return <pricing.default {...props} />;
    case '/convert':
      return <convert.default {...props} />;
    case '/forms':
      return <forms.default {...props} />;
    case '/privacy':
      return <privacy.default {...props} />;
    case '/terms':
      return <terms.default {...props} />;
    case '/security':
      return <security.default {...props} />;
    case '/support':
      return <support.default {...props} />;
    case '/maintenance':
      return <maintenance.default {...props} />;
    case '/guides':
      return <guides.default {...props} />;
    case '/blog':
      return <blog.default {...props} />;
  }
  if (path.startsWith('/guides/'))
    return <guide.default {...props} params={Promise.resolve({ slug: path.slice(8) })} />;
  if (path.startsWith('/blog/'))
    return <article.default {...props} params={Promise.resolve({ slug: path.slice(6) })} />;
  notFound();
}

// oxlint-disable-next-line react/only-export-components -- Metadata shares the same route dispatch.
export async function internationalResourceMetadata(path: string, props: Props) {
  let metadata: Metadata;
  switch (path) {
    case '/about':
      metadata = about.metadata;
      break;
    case '/account':
      metadata = account.metadata;
      break;
    case '/pricing':
      metadata = await pricing.generateMetadata(props);
      break;
    case '/convert':
      metadata = await convert.generateMetadata(props);
      break;
    case '/forms':
      metadata = forms.metadata;
      break;
    case '/privacy':
      metadata = privacy.metadata;
      break;
    case '/terms':
      metadata = terms.metadata;
      break;
    case '/security':
      metadata = security.metadata;
      break;
    case '/support':
      metadata = support.metadata;
      break;
    case '/maintenance':
      metadata = maintenance.metadata;
      break;
    case '/guides':
      metadata = guides.metadata;
      break;
    case '/blog':
      metadata = await blog.generateMetadata(props);
      break;
    default:
      if (path.startsWith('/guides/'))
        metadata = await guide.generateMetadata({
          ...props,
          params: Promise.resolve({ slug: path.slice(8) }),
        });
      else if (path.startsWith('/blog/'))
        metadata = await article.generateMetadata({
          ...props,
          params: Promise.resolve({ slug: path.slice(6) }),
        });
      else notFound();
  }
  const tr = translator(props.messages);
  // CMS article bodies retain their authored language; only their interface is localized.
  const canonical = path.startsWith('/blog/')
    ? path
    : localizedHref(props.locale, String(metadata.alternates?.canonical ?? path));
  const title = typeof metadata.title === 'string' ? tr(metadata.title) : metadata.title;
  const description = metadata.description ? tr(metadata.description) : metadata.description;
  return {
    ...metadata,
    title,
    description,
    alternates: {
      ...metadata.alternates,
      canonical,
      languages: canonical.includes('?') ? undefined : languageAlternates(path, siteUrl),
    },
    openGraph: {
      ...metadata.openGraph,
      title: typeof title === 'string' ? title : undefined,
      description: description ?? undefined,
      url: canonical,
      locale: localeInfo[props.locale].social,
    },
    twitter: {
      ...metadata.twitter,
      title: typeof title === 'string' ? title : undefined,
      description: description ?? undefined,
    },
  } satisfies Metadata;
}
