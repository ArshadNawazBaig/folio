import { serverToolSummaries } from '@/lib/server/tool-catalog';
import { DirectoryPageContent } from '@/components/directory-page-content';
import { listingMetadata } from '@/lib/seo';
import { toolDirectory, type DirectoryParams } from '@/lib/tool-directory';
type Props = { searchParams: Promise<DirectoryParams> };
export async function generateMetadata({ searchParams }: Props) {
  const directory = toolDirectory(serverToolSummaries(), await searchParams);
  return listingMetadata(
    'All PDF Tools — Edit, Organize, Convert & Sign',
    'Find PDF tools for existing text editing, annotations, and password protection. Merge, split, convert, fill, and sign PDFs in one place.',
    directory.canonical,
    1,
    directory.index,
  );
}
export default async function ToolsPage({ searchParams }: Props) {
  return <DirectoryPageContent params={await searchParams} />;
}
