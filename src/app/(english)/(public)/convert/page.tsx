import Content, { generateMetadata as contentMetadata } from '@/components/pages/convert';
type Props = Omit<Parameters<typeof Content>[0], 'locale' | 'messages'>;
export default function Page(props: Props) {
  return <Content {...props} />;
}
export function generateMetadata(
  props: Omit<Parameters<typeof contentMetadata>[0], 'locale' | 'messages'>,
) {
  return contentMetadata(props);
}
