import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
const ink = rgb(0.13, 0.16, 0.14),
  sage = rgb(0.82, 0.86, 0.8),
  paper = rgb(0.98, 0.97, 0.94),
  rust = rgb(0.77, 0.29, 0.2);
export async function createSample(kind = 'proposal') {
  const doc = await PDFDocument.create();
  const serif = await doc.embedFont(StandardFonts.TimesRoman);
  const sans = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const p = doc.addPage([595, 842]);
  p.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: paper });
  p.drawText('STUDIO NORTH', { x: 48, y: 787, size: 11, font: bold, color: ink });
  p.drawText(kind === 'proposal' ? 'SPACES FOR A SLOWER LIFE' : 'A LITTLE MORE ORGANIZED', {
    x: 48,
    y: 714,
    size: 8,
    font: sans,
    color: ink,
  });
  const title =
    kind === 'proposal'
      ? 'A place to\nmake your own.'
      : kind === 'onboarding'
        ? 'Welcome to\nthe team.'
        : kind === 'feedback'
          ? 'Your perspective\nmatters.'
          : 'Let’s start\nsomething good.';
  p.drawText(title, { x: 46, y: 654, size: 49, font: serif, lineHeight: 52, color: ink });
  if (kind === 'proposal') {
    p.drawRectangle({ x: 48, y: 177, width: 499, height: 350, color: sage });
    // An original architectural illustration, built from PDF vector geometry.
    p.drawRectangle({ x: 126, y: 198, width: 298, height: 252, color: rgb(0.86, 0.73, 0.59) });
    p.drawRectangle({ x: 151, y: 198, width: 218, height: 252, color: rgb(0.94, 0.85, 0.72) });
    p.drawRectangle({ x: 196, y: 198, width: 105, height: 143, color: rgb(0.38, 0.45, 0.36) });
    p.drawEllipse({ x: 248.5, y: 341, xScale: 52.5, yScale: 60, color: rgb(0.38, 0.45, 0.36) });
    p.drawRectangle({ x: 243, y: 198, width: 5, height: 201, color: rgb(0.78, 0.73, 0.57) });
    p.drawRectangle({ x: 195, y: 292, width: 107, height: 4, color: rgb(0.78, 0.73, 0.57) });
    p.drawRectangle({ x: 95, y: 190, width: 356, height: 11, color: rgb(0.77, 0.66, 0.53) });
    p.drawEllipse({ x: 452, y: 344, xScale: 37, yScale: 71, color: rgb(0.43, 0.51, 0.37) });
    p.drawEllipse({ x: 479, y: 316, xScale: 28, yScale: 49, color: rgb(0.37, 0.45, 0.32) });
    p.drawLine({
      start: { x: 453, y: 198 },
      end: { x: 453, y: 356 },
      thickness: 3,
      color: rgb(0.33, 0.39, 0.27),
    });
    p.drawText('A considered approach to the everyday.', {
      x: 48,
      y: 125,
      font: serif,
      size: 17,
      color: ink,
    });
    p.drawText('RESIDENTIAL DESIGN PROPOSAL', { x: 48, y: 69, size: 8, font: sans, color: ink });
    p.drawText('01 / 03', { x: 502, y: 69, size: 8, font: sans, color: ink });
    for (let n = 2; n <= 3; n++) {
      const page = doc.addPage([595, 842]);
      page.drawText('STUDIO NORTH', { x: 48, y: 787, size: 11, font: bold, color: ink });
      page.drawText(n === 2 ? 'Room to breathe.' : 'The next chapter.', {
        x: 48,
        y: 690,
        size: 42,
        font: serif,
        color: ink,
      });
      const lines =
        n === 2
          ? [
              'A home should feel like a deep breath. Our approach brings',
              'natural materials, generous light, and thoughtful details',
              'together to create spaces that feel unmistakably yours.',
              '',
              '01   DISCOVER',
              'We begin with a conversation about how you live.',
              '',
              '02   DESIGN',
              'A clear vision, shaped around the things you value.',
              '',
              '03   MAKE',
              'Carefully selected materials. Considered craftsmanship.',
            ]
          : [
              'Good spaces start with good conversations.',
              'Tell us what you have in mind and we will take it from there.',
              '',
              'PROJECT NOTES',
              '',
              'Prepared for: Your next big idea',
              'Timeline: To be agreed',
              'Next step: An introductory conversation',
            ];
      page.drawText(lines.join('\n'), {
        x: 48,
        y: 614,
        size: 13,
        lineHeight: 26,
        font: sans,
        color: ink,
      });
      page.drawLine({
        start: { x: 48, y: 110 },
        end: { x: 547, y: 110 },
        thickness: 1,
        color: sage,
      });
      page.drawText(
        `STUDIO NORTH                                       ${String(n).padStart(2, '0')} / 03`,
        { x: 48, y: 70, size: 9, font: sans, color: ink },
      );
    }
  } else {
    const form = doc.getForm();
    const labels =
      kind === 'onboarding'
        ? ['Full name', 'Email address', 'Role', 'Start date', 'A little about you']
        : kind === 'feedback'
          ? [
              'Your name',
              'Email address',
              'What worked well?',
              'What could we improve?',
              'Anything else?',
            ]
          : ['Your name', 'Email address', 'Project name', 'Your goals', 'Additional notes'];
    labels.forEach((label, i) => {
      const y = 493 - i * 72;
      p.drawText(label, { x: 48, y: y + 33, size: 10, font: sans, color: ink });
      const f = form.createTextField(label);
      if (i < 2) f.enableRequired();
      f.addToPage(p, {
        x: 48,
        y,
        width: 499,
        height: 27,
        borderColor: sage,
        borderWidth: 0.8,
        backgroundColor: rgb(1, 1, 1),
      });
    });
    p.drawText('A FOLIO SAMPLE TEMPLATE', { x: 48, y: 58, size: 8, font: sans, color: rust });
  }
  doc.setTitle(kind === 'proposal' ? 'Studio North — Design proposal' : `${kind} form`);
  doc.setProducer('Folio');
  return doc.save();
}
