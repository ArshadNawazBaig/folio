import {
  translator,
  localizedHref,
  localizeSummary,
  type PageLanguage,
} from '@/lib/i18n/translate';
import { permanentRedirect } from 'next/navigation';
import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { ToolDirectory } from '@/components/tool-directory';
import { breadcrumbSchema, collectionSchema } from '@/lib/seo';
import { StructuredData } from '@/components/structured-data';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
export function DirectoryPageContent({
  params = {},
  locale = 'en',
  messages = {},
}: PageLanguage & { params?: DirectoryParams }) {
  const tr = translator(messages);
  const href = (path: string) => localizedHref(locale, path);
  const catalog = serverToolSummaries().map((tool) => localizeSummary(tool, messages));
  const original = toolDirectory(catalog, params);
  const directory = { ...original, path: href(original.path), canonical: href(original.canonical) };
  if (directory.legacyPagination) permanentRedirect(directory.canonical);
  return (
    <main id="main" className="container directory-page with-page-heading">
      <StructuredData
        data={{
          ...collectionSchema(
            tr('Online PDF tools'),
            directory.canonical,
            directory.tools.map((tool) => ({ name: tool.name, path: href(`/${tool.slug}`) })),
          ),
          inLanguage: locale,
        }}
      />
      <StructuredData
        data={breadcrumbSchema([
          { name: tr('Home'), path: href('/') },
          { name: tr('All PDF tools'), path: href('/tools') },
        ])}
      />
      <div className="directory-heading page-heading">
        <span className="eyebrow">{tr('YOUR DOCUMENT TOOLKIT')}</span>
        <h1>
          {tr('Online tools')}
          <br />
          <em>{tr('for every document.')}</em>
        </h1>
        <p>
          {tr('From a quick edit to the finishing touches.')}
          <br />
          {tr('Find what you need, and get on with your day.')}
        </p>
      </div>
      <ToolDirectory key={directory.canonical} directory={directory} catalog={catalog} />
    </main>
  );
}
