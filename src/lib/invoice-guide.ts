import type { Guide } from './guides';

export const invoiceGuide: Guide = {
  slug: 'create-professional-invoice-online',
  title: 'How to Create a Professional Invoice Online: A Practical Guide',
  description:
    'Create a clear invoice with your logo, itemized charges, tax, discounts, and payment details. Follow a worked example, download a PDF, and keep an editable draft.',
  category: 'More possibilities',
  readTime: '9 min read',
  published: '2026-09-29',
  updated: '2026-10-04',
  tool: 'invoice-generator',
  relatedTools: ['merge-pdf', 'compress-pdf'],
  summary:
    'To make an invoice in Folio, open the invoice editor and add your business and customer details, enter an invoice number and dates, then list the products or services you are billing for. Review tax, discounts, shipping, and any payment already received. All 12 designs, custom colors, logos, payment QR codes, and watermark-free PDF downloads are free. Download a separate draft backup if you want to edit it later; a free account also lets you save up to 200 invoices.',
  sections: [
    {
      title: 'A useful invoice answers the customer’s next question',
      text: 'You have finished the work. The last thing you want is a string of messages asking what the charge covers, which project it belongs to, or where the payment should go. A useful invoice makes those answers easy to find. Your logo helps it feel familiar, but the details do most of the work: a recognizable project reference, specific descriptions, a clear due date, and payment instructions that match what you agreed. Think of the PDF as something that may be forwarded to a person who has never spoken to you. Could that person understand what to pay and why? Folio’s invoice generator keeps the editing controls beside a live preview so you can check that as you write.',
      links: [{ label: 'Create your invoice', href: '/invoice-editor' }],
    },
    {
      title: 'Gather the details before you start',
      text: 'Keep the customer’s billing details, agreed prices, project reference, and your payment instructions nearby. If the customer uses purchase orders, use the number they gave you rather than inventing a substitute. If someone else handles their accounts, confirm the billing name and address with that person. The checklist below is a practical starting point, not a universal legal template. Requirements depend on your location, business structure, and tax situation. For example, the UK government’s invoice guidance includes a supply date and additional rules for some businesses. Put a service period or supply date in the item description or notes when needed, and check your own jurisdiction’s requirements before sending.',
      table: {
        caption: 'Details that make an invoice easier to process',
        columns: ['Detail', 'What to enter', 'Why it helps'],
        rows: [
          {
            name: 'Business and customer',
            cells: [
              'The correct billing names, addresses, and contact details.',
              'Helps the recipient identify the parties and route questions.',
            ],
          },
          {
            name: 'Invoice number',
            cells: [
              'A reference that fits your existing numbering system.',
              'Makes a payment or follow-up easier to match to a document.',
            ],
          },
          {
            name: 'Dates and reference',
            cells: [
              'Invoice date, agreed due date, and a project or purchase-order reference.',
              'Connects the charge to the work and its payment timing.',
            ],
          },
          {
            name: 'Charges and adjustments',
            cells: [
              'Descriptions, quantities, rates, applicable tax treatment, and agreed discounts.',
              'Explains how the total was reached.',
            ],
          },
          {
            name: 'Payment instructions',
            cells: [
              'The payment destination and any reference the customer should include.',
              'Gives the customer a concrete next step.',
            ],
          },
        ],
      },
      links: [
        {
          label: 'UK government: invoice requirements for UK businesses',
          href: 'https://www.gov.uk/invoicing-and-taking-payment-from-customers/invoices-what-they-must-include',
        },
      ],
    },
    {
      title: 'Create an invoice in Folio, step by step',
      text: 'Choose Open invoice editor on the invoice generator page to enter the dedicated workspace. The editing panels and live preview have their own space, with saving and downloading always within reach. Start with New for a blank document, or choose Try a sample to see how a completed invoice fits together. The sample uses fictional businesses and prices. Replace them before sending anything. You can move between Details, Items, Payment & notes, and Design without losing your work while the tab remains open. On a phone, use Edit invoice and Live preview to switch views.',
      steps: [
        'In Details, enter your business and customer information. Add a logo if you want one; PNG, JPG, and WebP images up to 5 MB are accepted and resized for the invoice.',
        'Choose an invoice number, invoice date, due date, and currency. The Net 7, Net 14, Net 30, and Net 60 shortcuts set a due date from the invoice date. Check the resulting date against your agreement.',
        'In Items, describe each product or service and enter its quantity and rate. Add, duplicate, remove, or reorder lines as needed.',
        'Set the discount, tax treatment, and shipping. Mark individual items as exempt from the invoice tax when appropriate.',
        'In Payment & notes, enter any amount already received, add payment instructions, and include useful notes or agreed terms.',
        'In Design, choose the layout, accent color, and A4 or US Letter paper. Review the preview, then choose Download PDF.',
        'Open the downloaded PDF and check it before sending. Open File and choose Draft backup too if you want to return to the editable invoice later.',
      ],
    },
    {
      title: 'Write line items that someone else can understand',
      text: '“Design work” may make sense to you, but “Website homepage design — approved layout and mobile version” gives the customer something they can recognize. For hourly work, put the hours in Quantity and the hourly price in Rate. For a fixed project fee, use a quantity of 1. For products, use the number of units and the price per unit. You can include a service period, delivery date, or milestone in the description. Keep the wording factual and close to your agreement. Folio supports up to 50 lines and fractional quantities, so 2.5 hours does not need to become a separate manual calculation. Duplicate an item when two charges are similar, then change its description and values. Use the arrow controls to put the most important work first.',
    },
    {
      title: 'A worked example: discount, tax, shipping, and deposit',
      text: 'Imagine you are billing eight hours at USD 75 per hour, plus a fixed USD 200 deliverable. Both items are taxable in this example. You agreed a 10% discount on the items, enter an illustrative 8% tax rate added to prices, add USD 20 of untaxed shipping, and have already received USD 200. The table shows what the tool should display. These numbers demonstrate the calculation; they are not a recommended tax rate or treatment for your business.',
      table: {
        caption: 'Example invoice calculation in USD',
        columns: ['Step', 'Calculation', 'Amount'],
        rows: [
          { name: 'Hourly work', cells: ['8 × 75', '600.00'] },
          { name: 'Fixed deliverable', cells: ['1 × 200', '200.00'] },
          { name: 'Subtotal', cells: ['600 + 200', '800.00'] },
          { name: 'Discount', cells: ['10% of 800', '−80.00'] },
          { name: 'Tax', cells: ['8% of the discounted taxable items: 720', '57.60'] },
          { name: 'Shipping', cells: ['Added separately; not taxed in this example', '20.00'] },
          { name: 'Total', cells: ['800 − 80 + 57.60 + 20', '797.60'] },
          { name: 'Balance due', cells: ['797.60 − 200 already paid', '597.60'] },
        ],
      },
    },
    {
      title: 'Understand tax-inclusive prices and currency rounding',
      text: 'Use Add tax to prices when the entered rates exclude the tax. Use Prices include tax when it is already part of those rates; the tool shows the included tax without adding it again. For example, an included 20% tax within a price of 120 is 20, not 24. Folio applies the discount to item charges first, shares it proportionally between the lines, and rounds tax per taxable line. Shipping is separate and only receives the invoice tax when you check its tax option. The tool supports one invoice-level tax rate; it is not designed for invoices requiring several different tax rates or compound taxes. Currency selection also matters: JPY and KRW use no decimal places here, while KWD, BHD, and OMR use three. Changing the currency changes formatting and rounding, not the entered prices through an exchange rate. Review your numbers after any currency change.',
    },
    {
      title: 'Show deposits without charging for the same work twice',
      text: 'Enter a deposit you have actually received in Amount already paid. Keep the full agreed work in the item list so the customer can see the total and the remaining balance together. Adding a negative “deposit” item as well would count the payment twice. If the entered payment exceeds the total, Folio shows an overpayment credit instead of a negative balance due. Check whether you entered the correct amount before treating it as a real credit. These figures are entered manually: the invoice generator does not connect to your bank, verify that funds arrived, or automatically update payment status. A zero balance in the document reflects the numbers you supplied; downloading a PDF is not evidence that a payment took place.',
    },
    {
      title: 'Choose any design for free',
      text: 'All 12 invoice designs are free, including custom brand colors, a repeated footer, payment QR codes, logos, taxes, discounts, shipping, and deposits. Download a watermark-free PDF or a JSON draft backup. Sign in to save and update up to 200 invoices in your private account library. Review the final PDF before sharing it.',
      links: [{ label: 'Open the invoice editor', href: '/invoice-editor' }],
    },
    {
      title: 'Add payment instructions that work outside your own browser',
      text: 'Read your payment instructions as if you were the customer. Is the destination clear? Is the currency stated? Does the recipient need to include the invoice number as a payment reference? You can paste a full HTTPS checkout link you already use. You can turn that link into a QR code on the invoice for free. Scan the downloaded code with another device and check the destination and payee before sharing it. A QR code makes a link easier to open; it does not create a payment account, validate the recipient, or make a transaction secure by itself. Avoid using a checkout URL that only works while you are signed in to your own account. Folio does not collect card details or handle payments between you and your customer.',
    },
    {
      title: 'Keep a PDF for sending and a draft for editing',
      text: 'The PDF is the finished document your customer can read. The JSON draft contains the editable fields, calculation settings, and logo. Use Draft backup to save that second file, then Import draft when you want to continue working. Keep it somewhere private because it can contain customer addresses and payment instructions. Free drafts are not automatically saved online or in browser storage; closing or refreshing an unsaved tab can lose them. After signing in, Save to account stores the full draft privately, and My invoices in the dashboard lets you open or delete it later. Saving is explicit, so use Save to account again after making changes. If two tabs edit the same saved invoice, a conflicting save is stopped rather than silently replacing the other version. Back up your current draft before reopening the latest saved copy.',
    },
    {
      title: 'Reuse an invoice without reusing its mistakes',
      text: 'Duplicate invoice carries the details into a new working copy, clears the amount paid, and updates its dates. It suggests the next number when the old number ends in digits, but it does not reserve a unique invoice number across your business. Check the number, customer, dates, prices, project reference, and payment destination every time. A copied deposit or old rate is easy to overlook, which is why a final review matters even for familiar clients. All account saving, draft backups, and PDF designs are free. The library stores drafts, not a complete accounting ledger or an automatic record of what you sent.',
    },
    {
      title: 'Check the downloaded file before you send it',
      text: 'Open the actual PDF rather than relying only on the live preview. Long descriptions and notes may continue onto another page, so check the last page as well as the first. Read the business and customer names, verify the balance due, and test any payment QR code. On iPhone or Android, Folio prepares the file and then offers a fresh Download file or Share file action. If the PDF is not obvious afterward, look in your browser’s downloads list or your phone’s Files app. A font error means the export cannot represent a character in your text; use a supported spelling or transliteration and verify that it remains correct for your customer. Some writing systems are not supported by the current PDF font. Once the invoice is checked, send it through your usual email or client portal and keep your own copy.',
    },
  ],
};
