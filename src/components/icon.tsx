import {
  FilePenLine,
  Combine,
  Minimize2,
  Scissors,
  RotateCw,
  Files,
  Stamp,
  ListOrdered,
  Crop,
  Image,
  ImagePlus,
  Type,
  Signature,
  TextCursorInput,
  Languages,
  ArrowLeftRight,
  FileText,
  LockKeyhole,
  SquareDashedText,
} from 'lucide-react';
const icons = {
  edit: FilePenLine,
  merge: Combine,
  compress: Minimize2,
  split: Scissors,
  rotate: RotateCw,
  pages: Files,
  watermark: Stamp,
  numbers: ListOrdered,
  crop: Crop,
  image: Image,
  'image-plus': ImagePlus,
  text: Type,
  sign: Signature,
  form: TextCursorInput,
  translate: Languages,
  convert: ArrowLeftRight,
  protect: LockKeyhole,
  'text-edit': SquareDashedText,
};
export function ToolIcon({
  name,
  size = 22,
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const Icon = icons[name as keyof typeof icons] || FileText;
  return <Icon size={size} strokeWidth={1.6} aria-hidden="true" {...props} />;
}
