import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { DirectoryPageContent } from '@/components/directory-page-content';
import { listingMetadata } from '@/lib/seo';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverToolSummaries(), await searchParams);
  return listingMetadata(
    'Free Online Tools — PDFs, Images, Invoices & QR Codes',
    'Explore free PDF editors, image converters and compressors, invoice and signature generators, a QR code maker and a URL shortener. Find a tool for your task.',
    directory.canonical,
    1,
    directory.index,
  );
}
export default async function ToolsPage({ searchParams }: Props) {
  return <DirectoryPageContent params={await searchParams} />;
}
