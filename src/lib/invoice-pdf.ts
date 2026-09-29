import { PDFDocument, PDFString, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { invoiceDesign, invoiceDesignColors, invoiceInitials } from './invoice-designs';
import {
  invoiceFilename,
  invoiceIssues,
  invoiceMoney,
  invoiceProFeatures,
  invoiceSchema,
  invoiceTotals,
  type Invoice,
} from './invoice';

export type InvoicePdfStyle = {
  qr?: string;
};
export type InvoiceFonts = { regular: Uint8Array; bold: Uint8Array; heading?: Uint8Array };

function checkLogo(value: string) {
  const bytes = Uint8Array.from(atob(value.split(',')[1]), (char) => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  let width = 0,
    height = 0;
  if (value.startsWith('data:image/png')) {
    if (
      bytes.length < 24 ||
      bytes[0] !== 137 ||
      bytes[1] !== 80 ||
      bytes[2] !== 78 ||
      bytes[3] !== 71
    )
      throw new Error('Invalid PNG.');
    width = view.getUint32(16);
    height = view.getUint32(20);
  } else {
    if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('Invalid JPG.');
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1],
        length = view.getUint16(offset + 2);
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        height = view.getUint16(offset + 5);
        width = view.getUint16(offset + 7);
        break;
      }
      if (length < 2) break;
      offset += length + 2;
    }
  }
  if (!width || !height || width > 1024 || height > 1024)
    throw new Error('Choose a logo no larger than 1024 × 1024 pixels.');
}

export async function createFreeInvoicePdf(invoice: Invoice, fonts: InvoiceFonts) {
  if (invoiceProFeatures(invoice).length)
    throw new Error('Choose free options or download with Folio Pro.');
  return renderInvoicePdf(invoice, fonts);
}

// The authenticated export endpoint supplies premium fonts and payment QR images.
export async function renderInvoicePdf(
  input: Invoice,
  fonts: InvoiceFonts,
  style: InvoicePdfStyle = {},
) {
  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);
  const invoice = parsed.data,
    issues = invoiceIssues(invoice);
  if (issues.length) throw new Error(issues[0]);
  const design = invoiceDesign(invoice.template);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(fonts.regular, { subset: true });
  const bold = await doc.embedFont(fonts.bold, { subset: true });
  const heading = fonts.heading ? await doc.embedFont(fonts.heading, { subset: true }) : bold;
  const supported = new Set(regular.getCharacterSet());
  const checkText = (value: string) => {
    for (const char of value)
      if (char !== '\n' && char !== '\r' && char !== '\t' && !supported.has(char.codePointAt(0)!))
        throw new Error(
          `The PDF font does not support “${char}”. Use a supported Latin, Greek, or Cyrillic character before downloading.`,
        );
  };
  function walk(value: unknown): void {
    if (typeof value === 'string') checkText(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object')
      Object.entries(value).forEach(([key, item]) => {
        if (!['logo', 'paymentUrl'].includes(key)) walk(item);
      });
  }
  walk(invoice);
  const width = invoice.paper === 'a4' ? 595.28 : 612,
    height = invoice.paper === 'a4' ? 841.89 : 792;
  const margin = 42,
    content = width - margin * 2;
  const colors = invoiceDesignColors(invoice.accent);
  const color = (hex: string) =>
    rgb(
      ...([1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255) as [
        number,
        number,
        number,
      ]),
    );
  const accent = color(colors.text),
    brand = color(colors.accent),
    onBrand = color(colors.onAccent),
    tint = color(colors.tint);
  const ink = rgb(0.13, 0.14, 0.14),
    muted = rgb(0.36, 0.38, 0.39),
    line = rgb(0.86, 0.87, 0.86),
    white = rgb(1, 1, 1);
  // addPage(true) initializes the first page before any drawing below.
  let page!: PDFPage;
  let y = 0;
  const pages: PDFPage[] = [];
  const draw = (
    value: string,
    x: number,
    top: number,
    size = 10,
    font: PDFFont = regular,
    color = ink,
  ) => {
    checkText(value);
    page.drawText(value, { x, y: height - top - size, size, font, color });
  };
  const rule = (top: number) =>
    page.drawLine({
      start: { x: margin, y: height - top },
      end: { x: width - margin, y: height - top },
      color: line,
      thickness: 0.6,
    });
  const rectangle = (
    x: number,
    top: number,
    w: number,
    h: number,
    fill?: ReturnType<typeof rgb>,
    border?: ReturnType<typeof rgb>,
  ) =>
    page.drawRectangle({
      x,
      y: height - top - h,
      width: w,
      height: h,
      ...(fill ? { color: fill } : {}),
      ...(border ? { borderColor: border, borderWidth: 0.7 } : {}),
    });
  function wrap(value: string, maximum: number, size = 10, font = regular): string[] {
    const rows: string[] = [];
    for (const paragraph of value.replace(/\r/g, '').replace(/\t/g, ' ').split('\n')) {
      let row = '';
      for (const word of paragraph.split(/ +/)) {
        if (font.widthOfTextAtSize(row ? `${row} ${word}` : word, size) <= maximum)
          row = row ? `${row} ${word}` : word;
        else {
          if (row) rows.push(row);
          row = '';
          for (const char of word) {
            if (row && font.widthOfTextAtSize(row + char, size) > maximum) {
              rows.push(row);
              row = '';
            }
            row += char;
          }
        }
      }
      rows.push(row);
    }
    return rows;
  }
  const footerRows = invoice.footer ? wrap(invoice.footer, content - 65, 8) : [];
  const footerExtra = Math.max(0, footerRows.length - 1) * 10;
  const bottom = 65 + footerExtra;
  function addPage(first = false) {
    page = doc.addPage([width, height]);
    pages.push(page);
    y = margin;
    if (design.frame === 'side') rectangle(0, 0, 9, height, brand);
    if (design.frame === 'rail') {
      rectangle(0, 0, 24, height, tint);
      rectangle(0, 0, 7, height, brand);
    }
    if (design.frame === 'top') rectangle(0, 0, width, 9, brand);
    if (design.frame === 'border') rectangle(20, 20, width - 40, height - 40, undefined, brand);
    if (design.frame === 'double') {
      rectangle(margin, 24, content, 1, brand);
      rectangle(margin, 28, content, 0.5, brand);
    }
    if (!first) {
      draw('INVOICE · CONTINUED', margin, y, 10, bold, accent);
      const label = invoice.number.slice(0, 40);
      draw(label, width - margin - regular.widthOfTextAtSize(label, 9), y, 9, regular, muted);
      y += 28;
      rule(y);
      y += 18;
    }
  }
  function ensure(space: number) {
    if (y + space > height - bottom) addPage();
  }
  function block(
    value: string,
    x = margin,
    max = content,
    size = 10,
    font = regular,
    linkUrl?: string,
  ) {
    for (const row of wrap(value, max, size, font)) {
      ensure(size + 5);
      draw(row, x, y, size, font);
      if (linkUrl && row) {
        const annotation = doc.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: [x, height - y - size - 2, x + font.widthOfTextAtSize(row, size), height - y + 2],
          Border: [0, 0, 0],
          A: { S: 'URI', URI: PDFString.of(new URL(linkUrl).href) },
        });
        page.node.addAnnot(doc.context.register(annotation));
      }
      y += size + 5;
    }
  }
  addPage(true);
  const titleFont = design.serif ? heading : invoice.template === 'minimal' ? regular : bold;
  let titleX = margin,
    titleTop = margin + 15,
    titleSize = invoice.template === 'minimal' ? 24 : 30;
  let titleColor = invoice.template === 'minimal' ? ink : accent;
  let eyebrowX = margin,
    eyebrowTop = margin,
    eyebrowColor = muted;
  const eyebrow = 'A RECORD OF GOOD WORK';
  let logoTop = 34,
    logoInset = 0;
  y = margin + 85;
  if (design.header === 'dark' || design.header === 'banner') {
    rectangle(0, 0, width, 122, design.header === 'dark' ? ink : brand);
    titleColor = design.header === 'dark' ? white : onBrand;
    eyebrowColor = titleColor;
    eyebrowTop = 26;
    titleTop = 45;
    y = 143;
  } else if (design.header === 'split') {
    rectangle(margin, margin - 8, content * 0.6, 80, brand);
    titleX += 15;
    eyebrowX += 15;
    titleTop += 6;
    eyebrowTop += 6;
    titleColor = onBrand;
    eyebrowColor = onBrand;
    y = margin + 92;
  } else if (design.header === 'centered') {
    titleSize = 32;
    titleX = (width - titleFont.widthOfTextAtSize('INVOICE', titleSize)) / 2;
    eyebrowX = (width - regular.widthOfTextAtSize(eyebrow, 7)) / 2;
    rule(margin + 66);
  } else if (design.header === 'outline') {
    rectangle(margin, margin - 8, content, 82, undefined, brand);
    titleX += 15;
    eyebrowX += 15;
    logoTop = margin + 5;
    logoInset = 12;
    y = margin + 94;
  } else if (design.header === 'masthead') {
    titleSize = 23;
    titleColor = ink;
    rectangle(margin, margin + 57, content, 2, brand);
    rectangle(margin, margin + 62, content, 0.5, brand);
    y = margin + 80;
  } else if (design.header === 'monogram') {
    page.drawCircle({
      x: margin + 24,
      y: height - margin - 26,
      size: 24,
      color: tint,
      borderColor: brand,
      borderWidth: 0.8,
    });
    const initials = invoiceInitials(invoice.from.name);
    draw(
      initials,
      margin + 24 - bold.widthOfTextAtSize(initials, 16) / 2,
      margin + 16,
      16,
      bold,
      accent,
    );
    titleX += 64;
    eyebrowX += 64;
  }
  draw(eyebrow, eyebrowX, eyebrowTop, 7, regular, eyebrowColor);
  draw('INVOICE', titleX, titleTop, titleSize, titleFont, titleColor);
  if (invoice.logo) {
    try {
      checkLogo(invoice.logo);
      const logo = invoice.logo.startsWith('data:image/png')
        ? await doc.embedPng(invoice.logo)
        : await doc.embedJpg(invoice.logo);
      if (logo.width > 1024 || logo.height > 1024)
        throw new Error('Logo dimensions exceed the limit.');
      const scale = Math.min(105 / logo.width, 50 / logo.height);
      const logoX = width - margin - logo.width * scale - logoInset;
      rectangle(logoX - 4, logoTop - 4, logo.width * scale + 8, logo.height * scale + 8, white);
      page.drawImage(logo, {
        x: logoX,
        y: height - logoTop - logo.height * scale,
        width: logo.width * scale,
        height: logo.height * scale,
      });
    } catch {
      throw new Error('The logo could not be read. Choose a new PNG or JPG logo.');
    }
  }
  const meta = [
    `Invoice number: ${invoice.number}`,
    `Issued: ${invoice.issued}    Due: ${invoice.due}`,
    ...(invoice.reference ? [`Reference: ${invoice.reference}`] : []),
  ];
  block(meta.join('\n'), margin, content, 10);
  y += 18;
  rule(y);
  y += 20;
  const column = (content - 30) / 2;
  draw('FROM', margin, y, 8, bold, accent);
  draw('BILL TO', margin + column + 30, y, 8, bold, accent);
  y += 20;
  const partyText = (p: Invoice['from']) =>
    [p.name, p.address, p.email, p.taxId ? `Tax ID: ${p.taxId}` : ''].filter(Boolean).join('\n');
  const left = wrap(partyText(invoice.from), column),
    right = wrap(partyText(invoice.to), column);
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    ensure(15);
    if (left[index]) draw(left[index], margin, y);
    if (right[index]) draw(right[index], margin + column + 30, y);
    y += 15;
  }
  if (invoice.shipTo) {
    y += 15;
    ensure(30);
    draw('SHIP TO', margin, y, 8, bold, accent);
    y += 17;
    block(invoice.shipTo);
  }
  y += 25;
  // Reserve numeric column widths from actual values, including long currency amounts.
  const totals = invoiceTotals(invoice),
    money = (value: number) => invoiceMoney(value, invoice.currency);
  const amountWidth = Math.max(
    85,
    ...totals.amounts.map((a) => regular.widthOfTextAtSize(money(a), 9) + 10),
  );
  const rateWidth = Math.max(
    82,
    ...invoice.items.map(
      (item) =>
        regular.widthOfTextAtSize(
          `${invoice.currency} ${Number(item.rate || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
          9,
        ) + 10,
    ),
  );
  const quantityWidth = 54,
    descriptionWidth = content - amountWidth - rateWidth - quantityWidth - 16;
  const amountRight = width - margin,
    rateRight = amountRight - amountWidth,
    quantityRight = rateRight - rateWidth;
  function tableHead() {
    ensure(44);
    const dark = design.table === 'dark',
      ruled = design.table === 'ruled';
    page.drawRectangle({
      x: margin,
      y: height - y - 27,
      width: content,
      height: 27,
      color: dark ? ink : ruled ? white : tint,
    });
    if (ruled || design.table === 'grid') rule(y + 27);
    draw('DESCRIPTION', margin + 7, y + 8, 8, bold, dark ? white : ink);
    for (const [label, edge] of [
      ['QTY', quantityRight],
      ['RATE', rateRight],
      ['AMOUNT', amountRight],
    ] as const)
      draw(label, edge - bold.widthOfTextAtSize(label, 8) - 6, y + 8, 8, bold, dark ? white : ink);
    if (design.table === 'grid') gridLines(y, 27);
    y += 38;
  }
  function gridLines(top: number, size: number) {
    for (const x of [margin, quantityRight - quantityWidth, quantityRight, rateRight, amountRight])
      page.drawLine({
        start: { x, y: height - top },
        end: { x, y: height - top - size },
        color: line,
        thickness: 0.6,
      });
  }
  function rowDecoration(index: number, top: number, size: number) {
    if (design.table === 'striped' && index % 2 === 0) rectangle(margin, top, content, size, tint);
    if (design.table === 'grid') gridLines(top, size);
  }
  tableHead();
  for (const [index, item] of invoice.items.entries()) {
    const rows = wrap(
      item.description + (invoice.taxMode !== 'none' && !item.taxable ? '\nTax exempt' : ''),
      descriptionWidth,
      10,
    );
    if (y + rows.length * 15 + 16 > height - bottom) {
      addPage();
      tableHead();
    }
    for (const [lineIndex, row] of rows.entries()) {
      if (y + 16 > height - bottom) {
        addPage();
        tableHead();
      }
      rowDecoration(index, y - 4, 15);
      draw(row, margin + 7, y, 10);
      if (!lineIndex) {
        const values = [
          item.quantity,
          `${invoice.currency} ${Number(item.rate || 0).toLocaleString('en-US', { maximumFractionDigits: 4 })}`,
          money(totals.amounts[index]),
        ];
        [quantityRight, rateRight, amountRight].forEach((edge, i) =>
          draw(values[i], edge - regular.widthOfTextAtSize(values[i], 9) - 6, y, 9),
        );
      }
      y += 15;
    }
    rowDecoration(index, y - 4, 13);
    y += 9;
    rule(y);
    y += 12;
  }
  y += 9;
  const summary: [string, number][] = [
    ['Subtotal', totals.subtotal],
    ...(totals.discount ? [['Discount', -totals.discount] as [string, number]] : []),
    ...(totals.shipping ? [['Shipping', totals.shipping] as [string, number]] : []),
    ...(invoice.taxMode !== 'none'
      ? [
          [
            `${invoice.taxLabel || 'Tax'} ${invoice.taxRate || '0'}%${invoice.taxMode === 'inclusive' ? ' (included)' : ''}`,
            totals.tax,
          ] as [string, number],
        ]
      : []),
    ['Total', totals.total],
    ...(totals.paid ? [['Amount paid', totals.paid] as [string, number]] : []),
    [totals.credit ? 'Overpayment credit' : 'Balance due', totals.credit || totals.balance],
  ];
  const summaryX = margin + content * 0.35;
  const summaryRows = summary.map(([label, value], index) => {
    const last = index === summary.length - 1,
      font = last ? bold : regular,
      size = last ? 12 : 10;
    const valueText = money(value),
      valueWidth = font.widthOfTextAtSize(valueText, size);
    return {
      last,
      font,
      size,
      valueText,
      valueWidth,
      labels: wrap(label, width - margin - summaryX - valueWidth - 18, size, font),
    };
  });
  ensure(summaryRows.reduce((sum, row) => sum + Math.max(24, row.labels.length * 15 + 9), 0) + 30);
  for (const { last, font, size, valueText, valueWidth, labels } of summaryRows) {
    const rowHeight = Math.max(24, labels.length * 15 + 9);
    let textColor = last ? accent : ink;
    if (last) {
      if (design.balance === 'line') {
        rule(y - 5);
        y += 4;
      } else {
        y += 10;
        const filled = design.balance === 'filled';
        rectangle(
          summaryX - 10,
          y - 7,
          width - margin - summaryX + 20,
          rowHeight + 7,
          filled ? brand : design.balance === 'soft' ? tint : white,
          design.balance === 'outline' ? brand : undefined,
        );
        if (filled) textColor = onBrand;
      }
    }
    labels.forEach((label, index) => draw(label, summaryX, y + index * 15, size, font, textColor));
    draw(valueText, width - margin - valueWidth, y, size, font, textColor);
    y += rowHeight;
  }
  y += 20;
  for (const [title, value] of [
    ['PAYMENT DETAILS', invoice.paymentDetails],
    ['PAYMENT LINK', invoice.paymentUrl],
    ['NOTES', invoice.notes],
    ['TERMS', invoice.terms],
  ]) {
    if (!value) continue;
    ensure(45);
    draw(title, margin, y, 8, bold, accent);
    y += 18;
    block(
      value,
      margin,
      content,
      10,
      regular,
      title === 'PAYMENT LINK' ? invoice.paymentUrl : undefined,
    );
    y += 18;
  }
  if (style.qr) {
    ensure(104);
    const qr = await doc.embedPng(style.qr);
    page.drawImage(qr, { x: margin, y: height - y - 90, width: 90, height: 90 });
    draw('Scan to open the payment link', margin + 104, y + 30, 10, bold);
    draw('Confirm the recipient before paying.', margin + 104, y + 49, 9, regular, muted);
    y += 104;
  }
  for (const [index, current] of pages.entries()) {
    page = current;
    rule(height - 44 - footerExtra);
    footerRows.forEach((footer, row) =>
      draw(footer, margin, height - 32 - footerExtra + row * 10, 8, regular, muted),
    );
    const label = `${index + 1} / ${pages.length}`;
    draw(
      label,
      width - margin - regular.widthOfTextAtSize(label, 8),
      height - 32,
      8,
      regular,
      muted,
    );
  }
  doc.setTitle(`Invoice ${invoice.number}`);
  doc.setAuthor(invoice.from.name);
  doc.setSubject(`Invoice for ${invoice.to.name}`);
  doc.setCreator('Folio Invoice Generator');
  return { bytes: await doc.save(), filename: invoiceFilename(invoice), pages: pages.length };
}
