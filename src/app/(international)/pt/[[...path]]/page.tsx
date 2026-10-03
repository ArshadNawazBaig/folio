import {
  InternationalPage,
  internationalMetadata,
  internationalStaticParams,
  type InternationalProps,
} from '@/components/international-pages';
export const dynamicParams = true;
export const generateStaticParams = internationalStaticParams;
export function generateMetadata(props: InternationalProps) {
  return internationalMetadata('pt', props);
}
export default function Page(props: InternationalProps) {
  return InternationalPage('pt', props);
}
