import { InternationalLayout } from '@/components/international-pages';
export { metadata, viewport } from '@/components/root-document';
export default function Layout({ children }: { children: React.ReactNode }) {
  return <InternationalLayout locale="it">{children}</InternationalLayout>;
}
