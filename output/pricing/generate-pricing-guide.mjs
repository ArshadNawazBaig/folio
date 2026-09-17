import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(`${root}/package.json`);
const { chromium } = require('playwright');
const { PDFDocument } = require('pdf-lib');
const directory = new URL('./', import.meta.url);
const media = `${root}/.next/static/media`;
const files = await readdir(media);
async function font(prefix, family, weight, style = 'normal') {
  const name = files.find((file) => file.startsWith(`${prefix}.`) && file.endsWith('.woff2'));
  if (!name) throw new Error(`Missing brand font: ${prefix}`);
  const data = (await readFile(`${media}/${name}`)).toString('base64');
  return `@font-face{font-family:${family};font-weight:${weight};font-style:${style};src:url(data:font/woff2;base64,${data}) format('woff2');}`;
}
const fonts = (await Promise.all([
  font('manrope-latin-400-normal', 'Manrope', 400),
  font('manrope-latin-600-normal', 'Manrope', 600),
  font('manrope-latin-800-normal', 'Manrope', 800),
  font('dm-serif-display-latin-400-normal', 'DMSerif', 400),
  font('dm-serif-display-latin-400-italic', 'DMSerif', 400, 'italic'),
])).join('\n');

const logo = `<div class="logo" aria-label="Folio"><svg viewBox="0 0 29 34" fill="none" aria-hidden="true"><path d="M2 2h24v7H10v7h12v7H10v9H2V2Z" fill="currentColor"/><path d="M15 27h12v5H15z" fill="#c44934"/></svg><span>folio<span class="accent">.</span></span></div>`;
const header = (label) => `<header>${logo}<span class="header-label">PRICING GUIDE <i>/</i> ${label}</span></header>`;
const footer = (page, label) => `<footer><a href="https://thebestfreepdf.com">thebestfreepdf.com</a><span>${label}</span><span>${String(page).padStart(2, '0')} / 06</span></footer>`;
const section = (page, label, body) => `<section class="page">${header(label)}<main>${body}</main>${footer(page, label)}</section>`;
const heading = (eyebrow, title, intro = '') => `<div class="chapter"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1>${intro ? `<p class="intro">${intro}</p>` : ''}</div>`;
const pill = (label, cls = '') => `<span class="pill ${cls}">${label}</span>`;

const pages = [];
pages.push(section(1, 'THE PLANS', `
  <div class="cover-heading"><div class="eyebrow">FOLIO · PDF EDITING & DOCUMENT TOOLS</div><h1>A plan for<br><em>better paperwork.</em></h1><p class="cover-intro">Start with useful free tools. Choose Pro when your finished document needs original-text editing or password protection.</p></div>
  <div class="plan-grid">
    <article class="plan-card"><div class="eyebrow">EVERYDAY ESSENTIALS</div><h2>Folio Free</h2><div class="price">$0</div><div class="price-caption">No subscription</div><hr><strong>100 MB</strong><p>Private cloud storage</p><ul><li>Free tool downloads</li><li>No card required</li><li>Guest or signed-in access</li></ul></article>
    <article class="plan-card trial"><div class="eyebrow">TRY ALL PRO FEATURES</div><h2>7-day trial</h2><div class="price">$1</div><div class="price-caption">USD for 7 days</div><hr><strong>1 GB</strong><p>Private cloud storage</p><ul><li>Premium downloads</li><li>One offer per account</li><li>Then $25 USD/month</li></ul></article>
    <article class="plan-card monthly"><div class="eyebrow">ROOM TO KEEP WORKING</div><h2>Monthly</h2><div class="price">$25</div><div class="price-caption">USD per month</div><hr><strong>Unlimited</strong><p>Private cloud storage</p><ul><li>Premium downloads</li><li>Monthly billing</li><li>Cancel before renewal</li></ul></article>
  </div>
  <div class="statement"><span class="eyebrow">EDIT FIRST. CHOOSE AT DOWNLOAD.</span><h2>Your work comes first.</h2><p>Editing and previews are available before purchase. A subscription is required only when the finished download includes a premium change. Free-tool downloads stay free and receive no Folio watermark.</p></div>
  <div class="notice"><strong>The trial is a paid introductory offer.</strong> Pay $1 USD for seven days. It renews automatically at $25 USD per month unless you cancel before the trial ends. Monthly storage becomes unlimited after the first monthly payment is confirmed.</div>
  <div class="edition">Prepared 18 September 2026 <span>All prices in USD · Detailed features and limits inside</span></div>
`));

const rows = [
  ['Price', '$0', '$1 / 7 days', '$25 / month'],
  ['Private cloud storage', '100 MB', '1 GB', 'Unlimited¹'],
  ['Add text, highlights, images & annotations', 'Included', 'Included', 'Included'],
  ['Draw, type or upload a visual signature', 'Included', 'Included', 'Included'],
  ['Fill forms & create fillable fields', 'Included', 'Included', 'Included'],
  ['Merge, split, compress & crop PDFs', 'Included', 'Included', 'Included'],
  ['Rotate, reorder, delete & duplicate pages', 'Included', 'Included', 'Included'],
  ['Add watermarks & page numbers', 'Included', 'Included', 'Included'],
  ['PDF to JPG/PNG; extract selectable text', 'Included', 'Included', 'Included'],
  ['Images to PDF; JPG ↔ WEBP conversion', 'Included', 'Included', 'Included'],
  ['Image compression, adjustments & QR codes', 'Included', 'Included', 'Included'],
  ['Preview original-text edits & protection', 'Included²', 'Included', 'Included'],
  ['Download original PDF text changes', 'Plan required', 'Included', 'Included'],
  ['Download password-protected PDFs', 'Plan required', 'Included', 'Included'],
  ['Saved library & account settings', 'Included³', 'Included', 'Included'],
  ['Billing portal & subscription management', 'Not applicable', 'Included', 'Included'],
];
pages.push(section(2, 'COMPARE FEATURES', `
  ${heading('01 / AT A GLANCE', 'The right tools.<br><em>The right amount of space.</em>', 'Both paid options include the same core Pro download features. Their price, billing period and storage allowance differ.')}
  <table class="comparison"><colgroup><col style="width:49%"><col style="width:17%"><col style="width:17%"><col style="width:17%"></colgroup><thead><tr><th>Feature</th><th>Free</th><th>7-day trial</th><th>Monthly</th></tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell, i) => `<${i ? 'td' : 'th'}${i ? '' : ' scope="row"'}>${cell}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</tbody></table>
  <div class="footnotes"><p><strong>1.</strong> Unlimited means no total storage or saved-file-count quota while a verified monthly subscription remains active. Per-file and processing limits still apply.</p><p><strong>2.</strong> Opening Edit Text or selecting a text block does not turn a free download into a paid one. A premium change must remain in the finished document.</p><p><strong>3.</strong> Guests have a dashboard tied to their browser, with files expiring after 24 hours. Sign in to keep files in your account and access them across devices.</p></div>
  <div class="small-callout">Translation and Office conversion depend on tool availability. They are not part of the core feature promises in this guide. See page 4 before buying for those workflows.</div>
`));

pages.push(section(3, 'FOLIO FREE', `
  ${heading('02 / THE EVERYDAY PLAN', 'Useful from<br><em>the first document.</em>', 'Folio Free includes everyday PDF editing and document utilities, with no subscription required for their finished downloads.')}
  <div class="two-col free-groups">
    <article class="panel"><span class="panel-number">01</span><h2>Annotate, sign & fill</h2><ul><li>Add new text, highlights and annotations.</li><li>Place images and draw on a page.</li><li>Draw, type or upload a visual signature.</li><li>Fill forms and create fillable fields.</li></ul><p class="caption">Adding a text box is different from replacing the original PDF text.</p></article>
    <article class="panel"><span class="panel-number">02</span><h2>Organize your PDF</h2><ul><li>Merge files or split out selected pages.</li><li>Compress PDFs and adjust page crops.</li><li>Rotate, reorder, duplicate or delete pages.</li><li>Add watermarks and page numbers.</li></ul><p class="caption">Compression results depend on the source document; some files may not shrink.</p></article>
    <article class="panel"><span class="panel-number">03</span><h2>Convert & extract</h2><ul><li>Export PDF pages as JPG or PNG.</li><li>Extract text that is already selectable.</li><li>Turn JPG, PNG or WEBP images into PDF pages.</li><li>Combine mixed images in one PDF.</li></ul><p class="caption">Text extraction does not recognize scanned or photographed text.</p></article>
    <article class="panel"><span class="panel-number">04</span><h2>Images & QR codes</h2><ul><li>Convert JPG to WEBP or WEBP to JPG.</li><li>Compress JPG, PNG and WEBP images.</li><li>Adjust brightness, color and sharpness.</li><li>Create static QR codes as PNG or SVG.</li></ul><p class="caption">Photo adjustments do not reconstruct missing detail or add AI super-resolution.</p></article>
  </div>
  <div class="two-col account-options"><article><h3>Continue as a guest</h3><p>Use the dashboard and 100 MB of private cloud storage in your current browser. Files expire 24 hours after upload. Clearing the browser’s session data can remove access.</p></article><article><h3>Sign in with Google</h3><p>Keep the same 100 MB free allowance, retain account files beyond the guest expiry and access them across devices. Paid checkout and billing management require sign-in.</p></article></div>
  <div class="small-callout">Good fit for: everyday paperwork, adding notes, signing a form, combining receipts or converting a PDF page to an image.</div>
`));

pages.push(section(4, 'FOLIO PRO', `
  ${heading('03 / PREMIUM DOWNLOADS', 'Change the original.<br><em>Keep control of the result.</em>', 'The paid trial and monthly subscription unlock the same core Pro features. You can inspect and preview these changes before choosing a plan.')}
  <article class="feature-block"><div>${pill('CORE PRO FEATURE')}</div><h2>Edit the PDF’s original text</h2><p>Replace or delete supported PDF text objects directly on the page. Move or copy an edited original-text block, adjust replacement fonts, size and color, and use find-and-replace across the document.</p><div class="example"><strong>Example:</strong> Correct a name or amount already printed in a PDF, review the result, then use your active plan to download the changed document.</div><p class="caption">Text editing works one block at a time; paragraphs do not automatically reflow. Supported embedded fonts, weight and color are preserved where possible. Missing characters may use a matching fallback. Scans and outlined letters are not ordinary editable text.</p></article>
  <article class="feature-block"><div>${pill('CORE PRO FEATURE')}</div><h2>Password protection</h2><p>Create a password-protected PDF using AES-256 encryption. Set an opening password and review the settings before exporting. The protected download requires an active paid plan.</p><p class="caption">Opening passwords are not saved with your workspace. Keep the password somewhere you can retrieve it.</p></article>
  <div class="notice"><strong>Mixed edits are handled at download.</strong> A document with free annotations and original-text changes requires Pro to export. Undo all original-text changes to return to a free annotation-only download. A visual signature alone remains free.</div>
  <div class="availability"><h3>Check availability before choosing Pro for another tool</h3><p>PDF translation and PDF-to-Word, Excel or PowerPoint conversion require connected document services and are excluded from this guide’s core package promises. Check the individual tool page before buying for these workflows.</p><p>Standalone OCR, RTF/EPUB conversion, reverse Office conversion, transcription and audio/video conversion are planned capabilities, not available features included here.</p></div>
  <p class="caption bottom-note">Deleting a text object is not secure redaction. Visual signatures do not include a digital signing certificate.</p>
`));

pages.push(section(5, 'STORAGE & LIMITS', `
  ${heading('04 / SPACE THAT FITS YOUR WORK', 'More storage.<br><em>Clear working limits.</em>', 'Storage capacity and document-processing limits are separate. A larger storage plan does not increase the maximum size of an individual file.')}
  <div class="storage-strip"><article><div class="eyebrow">FREE / GUEST</div><strong>100 MB</strong><span>Up to 200 saved PDFs</span></article><article><div class="eyebrow">PAID TRIAL</div><strong>1 GB</strong><span>Up to 200 saved PDFs</span></article><article><div class="eyebrow">PAID MONTHLY</div><strong>Unlimited</strong><span>No saved-file-count quota</span></article></div>
  <table class="limits"><thead><tr><th>Workflow</th><th>Current limit</th></tr></thead><tbody><tr><th scope="row">Cloud library / main editor upload</th><td>Up to 50 MB per PDF</td></tr><tr><th scope="row">Original-text editing & password protection</th><td>Up to 10 MB and 100 pages per file</td></tr><tr><th scope="row">Premium download requests</th><td>20 per minute; 500 per day</td></tr><tr><th scope="row">Image and standard batch tools</th><td>Up to 20 files; 50 MB each; 150 MB combined, where batching is supported</td></tr><tr><th scope="row">Guest file availability</th><td>24 hours after upload, tied to the browser session</td></tr></tbody></table>
  <div class="two-col storage-notes"><article><h3>When your space fills up</h3><p>Uploads and saves that exceed the allowance are blocked. Delete old cloud files to free space, or choose an eligible paid plan. Source PDFs, saved workspaces and recovery data can all contribute to usage.</p></article><article><h3>After the trial</h3><p>The 1 GB allowance becomes unlimited after the first monthly payment is confirmed. If paid access ends, the account returns to its free allowance; being over that allowance can prevent new uploads.</p></article></div>
  <div class="statement compact"><h2>Private saving, with clear controls.</h2><p>The main editor uploads PDFs and saves changes to private cloud storage for refresh recovery. Guests use a browser-bound session; signed-in users use their account. Wait for “All changes saved” before closing or refreshing.</p><p>Many standalone free tools process locally in the browser. Original-text editing and protection also use server processing. Delete saved files through your dashboard; downloaded copies remain wherever you saved them.</p></div>
  <p class="caption">Unlimited storage applies to an active, verified monthly subscription. It does not mean unlimited file size, processing speed or download requests. Each tool’s displayed limits still apply.</p>
`));

pages.push(section(6, 'BILLING & NEXT STEPS', `
  ${heading('05 / KNOW WHAT HAPPENS NEXT', 'Simple billing.<br><em>No surprises at renewal.</em>', 'All prices are in US dollars. Review the final amount, any applicable taxes and the renewal date shown at checkout before confirming your purchase.')}
  <div class="billing-flow"><article><span class="step-number">1</span><div><h3>Start the paid trial — $1 USD</h3><p>Your seven-day introductory period starts when checkout creates your subscription. It includes Pro features and 1 GB of private storage. Available once per account.</p></div></article><article><span class="step-number">2</span><div><h3>Continue after seven days — $25 USD/month</h3><p>The subscription renews automatically unless you cancel before the trial ends. Unlimited storage starts after the first monthly payment is confirmed.</p></div></article><article><span class="step-number">3</span><div><h3>Or choose monthly immediately — $25 USD/month</h3><p>Skip the introductory period. Monthly billing starts straight away, with Pro features and unlimited storage after payment confirmation.</p></div></article></div>
  <div class="two-col billing-details"><article><h3>Manage or cancel</h3><p>Open <strong>Dashboard → Billing → Manage billing</strong> to use the Lemon Squeezy portal. Cancel before your next renewal to avoid the next charge. End-of-period cancellation keeps access through the paid period.</p></article><article><h3>Payments & activation</h3><p>Lemon Squeezy hosts checkout and shows available payment methods. Folio does not collect card numbers. Access depends on confirmed payment; failed or unpaid renewals do not grant another paid period.</p></article></div>
  <div class="faq-mini"><h3>Will signing in interrupt my editing?</h3><p>Sign-in and checkout can open in a new tab while the editor stays open. Let the document finish saving before switching away. After payment, return to the editor and check your access to download.</p><h3>Do I need Pro for every document?</h3><p>No. Use free tools and free editor changes without a subscription. Choose Pro when the finished file contains original-text edits or password protection.</p></div>
  <div class="next-step"><div><span class="eyebrow">READY WHEN YOU ARE</span><h2>Choose your next step.</h2></div><div class="document-links"><a href="https://thebestfreepdf.com/tools">Explore free tools ↗</a><a href="https://thebestfreepdf.com/pricing">View pricing ↗</a><a href="https://thebestfreepdf.com/support">Get billing help ↗</a><a href="https://thebestfreepdf.com/privacy">Read the privacy policy ↗</a></div></div>
  <p class="caption version-note">Guide version: 18 September 2026. Based on Folio’s agreed prices and configured core features and limits. Availability and plan terms can change; review the current product page and checkout details before purchasing. This guide does not introduce an annual, lifetime or team plan.</p>
`));

const css = `
${fonts}
@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;color:#202522;background:#e7e7e1;font-family:Manrope,Arial,sans-serif;font-size:13px;line-height:1.55;-webkit-print-color-adjust:exact;print-color-adjust:exact}a{color:inherit;text-decoration:none}.page{width:210mm;height:297mm;padding:16mm 17mm 21mm;background:#f7f6f2;position:relative;break-after:page;overflow:hidden}.page:last-child{break-after:auto}header{display:flex;align-items:center;justify-content:space-between;padding-bottom:17px;border-bottom:1px solid #dcded5}.logo{display:flex;align-items:center;gap:7px}.logo svg{width:21px;height:26px}.logo>span{font-weight:800;font-size:31px;letter-spacing:-2px;line-height:1}.accent,em{color:#c44934}em{font-weight:400}.header-label{font-size:9px;font-weight:600;letter-spacing:1.4px;color:#606858}.header-label i{padding:0 8px;color:#b8bfad;font-style:normal}footer{position:absolute;bottom:11mm;left:17mm;right:17mm;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #dcded5;padding-top:10px;font-size:9px;color:#606858}footer span:nth-child(2){text-transform:uppercase;letter-spacing:1px;font-size:8px}main{padding-top:28px}h1,h2,h3,p{margin:0}h1,h2{font-family:DMSerif,Georgia,serif;font-weight:400;letter-spacing:-.7px}h1{font-size:39px;line-height:1.08}h2{font-size:24px;line-height:1.14}h3{font-size:13px;line-height:1.4;font-weight:800;margin-bottom:6px}p{margin-top:9px}strong{font-weight:800}.eyebrow{font-size:9px;font-weight:800;letter-spacing:1.7px;color:#606858}.chapter{margin-bottom:22px}.chapter h1{margin-top:11px}.intro{max-width:620px;font-size:13px;color:#606858;line-height:1.65;margin-top:12px}.cover-heading h1{font-size:57px;line-height:1.03;margin-top:16px;letter-spacing:-1.8px}.cover-intro{font-size:14px;line-height:1.7;max-width:580px;margin-top:16px;color:#606858}.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:29px}.plan-card{background:#fffdf9;border:1px solid #dedfd7;border-radius:12px;padding:19px 17px 18px}.plan-card .eyebrow{font-size:7.5px;letter-spacing:1.1px;white-space:nowrap}.plan-card h2{font-size:26px;margin-top:10px}.price{font-size:56px;line-height:1.15;font-weight:800;letter-spacing:-3px;margin-top:14px}.trial .price{color:#c44934}.price-caption{font-size:11px;color:#606858}.plan-card hr{border:0;border-top:1px solid #dedfd7;margin:19px 0 14px}.plan-card>strong{font-size:20px}.plan-card>p{font-size:10px;margin-top:1px;color:#606858}.plan-card ul{font-size:10.6px;margin-top:14px}.trial{background:#fbefe8;border-color:#eac7b9}.monthly{background:#eaf0e2;border-color:#c8d5b8}ul{padding-left:16px;margin:12px 0 0}li{padding-left:2px;margin-bottom:7px}li::marker{color:#849971}.statement{border-top:1px solid #dcded5;margin-top:26px;padding-top:20px}.statement h2{margin-top:7px;font-size:29px}.statement p{font-size:12px;line-height:1.65}.notice{padding:15px 17px;background:#eeeede;border:1px solid #dddec8;border-radius:9px;font-size:11px;line-height:1.65;margin-top:22px}.edition{margin-top:24px;font-size:9px;font-weight:600;color:#606858;display:flex;justify-content:space-between}.edition span{font-weight:400}table{border-collapse:collapse;width:100%;background:#fffdf9;font-size:10.5px;line-height:1.45}thead{background:#e9eee2}th,td{text-align:left;padding:10px 11px;border-bottom:1px solid #e0e2d9}thead th{font-size:10px;font-weight:800;padding-top:12px;padding-bottom:12px}tbody th{font-weight:600}.comparison td{font-size:10px;vertical-align:middle}.comparison tr:nth-child(-n+2) td{font-weight:800;color:#425b36}.comparison tr:nth-child(-n+2) th{font-weight:800}.footnotes{margin-top:18px;font-size:10px;line-height:1.55;color:#606858}.footnotes p{margin-top:7px}.small-callout{margin-top:17px;padding:12px 15px;border-left:3px solid #94a67b;background:#edf0e7;font-size:10.5px;line-height:1.65}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}.panel{background:#fffdf9;border:1px solid #dedfd7;border-radius:10px;padding:18px 20px}.panel-number{display:inline-flex;color:#809168;font-size:11px;font-weight:800;letter-spacing:1px;margin-bottom:9px}.panel h2{font-size:23px;letter-spacing:-.5px}.panel ul{font-size:11.5px;line-height:1.55}.caption{font-size:10px;line-height:1.6;color:#606858}.panel .caption{padding-top:7px;border-top:1px solid #e2e3dd;margin-top:11px}.account-options{padding:21px 0 0;margin-top:3px}.account-options p{font-size:11.5px;line-height:1.7}.pill{font-size:8px;letter-spacing:1px;font-weight:800;padding:5px 9px;display:inline-block;background:#e8efde;color:#536b3e;border:1px solid #cfdabb;border-radius:4px}.feature-block{padding-bottom:21px;border-bottom:1px solid #dcded5;margin-bottom:20px}.feature-block h2{margin-top:11px;font-size:27px}.feature-block p{font-size:12px;line-height:1.65}.feature-block .caption{font-size:10.5px}.example{background:#fffdf9;border:1px solid #dedfd7;border-radius:7px;padding:11px 13px;font-size:11px;line-height:1.6;margin-top:12px}.availability{margin-top:20px}.availability p{font-size:11px;line-height:1.6}.bottom-note{padding-top:12px;margin-top:15px;border-top:1px solid #dcded5}.storage-strip{display:grid;grid-template-columns:1fr 1fr 1.2fr;background:#eaf0e2;border:1px solid #d0dac4;border-radius:10px;overflow:hidden;margin-bottom:20px}.storage-strip article{padding:17px 16px;border-right:1px solid #d0dac4}.storage-strip article:last-child{border-right:0}.storage-strip strong{display:block;font-size:25px;letter-spacing:-1px;margin-top:6px}.storage-strip span{font-size:9.3px;color:#606858;display:block;margin-top:2px}.storage-strip .eyebrow{font-size:8px}.limits{font-size:11px}.limits th{width:49%}.limits td{font-size:10.5px}.limits th,.limits td{padding:12px}.storage-notes{margin-top:22px}.storage-notes p{font-size:11.5px;line-height:1.65}.compact{margin-top:23px;padding-top:16px}.compact h2{font-size:25px}.compact p{font-size:11.5px}.compact+.caption{margin-top:16px}.billing-flow{display:grid;gap:14px}.billing-flow article{display:flex;gap:14px;padding-bottom:14px;border-bottom:1px solid #dcded5}.step-number{width:31px;height:31px;flex:0 0 31px;background:#e7eddd;border-radius:50%;display:grid;place-items:center;color:#586d43;font-size:12px;font-weight:800}.billing-flow h3{font-size:13px}.billing-flow p{font-size:11.5px;line-height:1.65;margin-top:4px}.billing-details{margin-top:20px}.billing-details p{font-size:11px;line-height:1.65}.faq-mini{margin-top:20px}.faq-mini h3{font-size:12px;margin-top:14px}.faq-mini p{font-size:11px;line-height:1.65;margin-top:3px}.next-step{margin-top:22px;padding:17px 19px;background:#eaf0e2;border:1px solid #d0dac4;border-radius:9px;display:flex;align-items:center;justify-content:space-between;gap:14px}.next-step h2{font-size:25px;margin-top:5px}.document-links{display:grid;gap:5px;font-size:10px;font-weight:600}.document-links a{border-bottom:1px solid #b8c7a8;width:max-content}.version-note{margin-top:16px;font-size:9px}.overflow-warning{display:none}
.comparison th,.comparison td{padding-top:7px;padding-bottom:7px}.limits th,.limits td{padding-top:10px;padding-bottom:10px}
@media screen{body{padding:24px}.page{margin:0 auto 24px;box-shadow:0 3px 20px #20252214}}
`;
const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Folio — Detailed Pricing & Plan Guide</title><style>${css}</style></head><body>${pages.join('\n')}</body></html>`;
await mkdir(directory, { recursive: true });
await writeFile(new URL('Folio-Pricing-Guide.html', directory), html);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 }, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  const overflow = await page.locator('.page').evaluateAll((nodes) => nodes.map((node, i) => {
    const main = node.querySelector('main').getBoundingClientRect();
    const footer = node.querySelector('footer').getBoundingClientRect();
    return { page: i + 1, bottom: main.bottom, footerTop: footer.top, gap: footer.top - main.bottom, horizontalOverflow: node.scrollWidth > node.clientWidth + 1 };
  }).filter((row) => row.gap < 12 || row.horizontalOverflow));
  if (overflow.length) throw new Error(`Page layout overflow: ${JSON.stringify(overflow)}`);
  const raw = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, tagged: true, outline: true });
  const pdf = await PDFDocument.load(raw);
  if (pdf.getPageCount() !== 6) throw new Error(`Expected six pages, got ${pdf.getPageCount()}`);
  pdf.setTitle('Folio — Detailed Pricing & Plan Guide');
  pdf.setAuthor('Folio');
  pdf.setSubject('Free, $1 seven-day trial and $25 monthly plans, features, storage limits and billing terms.');
  pdf.setKeywords(['Folio', 'PDF tools', 'pricing', 'trial', 'monthly subscription', 'thebestfreepdf.com']);
  pdf.setLanguage('en-US');
  await writeFile(new URL('Folio-Pricing-Guide.pdf', directory), await pdf.save());
  for (const number of [1, 2, 3, 4, 5, 6]) {
    await page.locator('.page').nth(number - 1).screenshot({ path: fileURLToPath(new URL(`page-${number}.png`, directory)) });
  }
  console.log(JSON.stringify({ pdf: fileURLToPath(new URL('Folio-Pricing-Guide.pdf', directory)), pages: pdf.getPageCount(), layout: 'No content overflow; at least 12px clearance above footers.' }));
} finally {
  await browser.close();
}
