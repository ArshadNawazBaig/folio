import Content from '@/components/pages/account';
export { metadata } from '@/components/pages/account';
type Props = Omit<Parameters<typeof Content>[0], 'locale' | 'messages'>;
export default function Page(props: Props) {
  return <Content {...props} />;
}
