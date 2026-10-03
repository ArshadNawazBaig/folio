import Content, { generateMetadata as contentMetadata } from '@/components/pages/pricing';
export const dynamic = 'force-dynamic';
export default function Page() {
  return <Content />;
}
export function generateMetadata() {
  return contentMetadata();
}
