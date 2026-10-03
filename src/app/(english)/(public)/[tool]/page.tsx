import { notFound } from 'next/navigation';
import { serverTools } from '@/lib/server/tool-catalog';
import { tools } from '@/lib/tools';
import { pageMetadata } from '@/lib/seo';
import { toolSearchTitle } from '@/lib/tool-seo';
import { ToolPageContent } from '@/components/tool-page-content';
export const dynamicParams = false;
// Provider availability is deployment configuration, just like /api/capabilities.
// All tool landing pages can be rendered once during the build.
export function generateStaticParams() {
  return tools.map((t) => ({ tool: t.slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }) {
  const slug = (await params).tool;
  const catalog = serverTools();
  const t = catalog.find((t) => t.slug === slug);
  return t ? pageMetadata(toolSearchTitle(t), t.description, `/${t.slug}`, t.available) : {};
}
export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params;
  const tool = serverTools().find((tool) => tool.slug === slug);
  if (!tool) notFound();
  return <ToolPageContent tool={tool} />;
}
