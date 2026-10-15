import type { Guide } from './guides';

export const formsGuideRevision: NonNullable<Guide['englishRevision']> = {
  updated: '2026-10-15',
  readTime: '4 min read',
  summary:
    'Send a fillable PDF when the next person must enter or change answers. A flattened copy makes the current field appearances part of the page and removes those interactive fields. In Folio, open the Form panel and choose Flatten fields when exporting only for a completed copy. Keep an interactive original, and reopen both downloads to check the values and field behavior.',
  sections: [
    {
      title: 'Choose the version your recipient can use',
      text: 'A blank line printed on a page is not necessarily a form field. A fillable PDF contains interactive controls that a compatible reader can focus and complete. A scanned form may look identical while containing only pixels. Before changing the document, try clicking a known answer area in a PDF reader and inspect the Form panel in Folio.',
      table: {
        caption: 'When to keep fields interactive and when to flatten them',
        columns: ['Situation', 'Useful output', 'Check before sending'],
        rows: [
          {
            name: 'A blank questionnaire for several people',
            cells: [
              'Fillable PDF',
              'Leave answers blank and test that the recipient can enter values.',
            ],
          },
          {
            name: 'Answers still need correction or approval',
            cells: [
              'Fillable working copy',
              'Keep the field values editable and label the file as a draft.',
            ],
          },
          {
            name: 'A completed copy for reading or printing',
            cells: [
              'Flattened PDF, if the recipient accepts it',
              'Check that every value is visible; the recipient cannot fill those fields afterward.',
            ],
          },
          {
            name: 'A portal expects interactive fields or a specific form',
            cells: [
              'The format requested by the portal',
              'Flattening may remove fields needed for further processing.',
            ],
          },
        ],
      },
    },
    {
      title: 'Fill existing fields or create a reusable form',
      text: 'Open Create a PDF form and your document, then enter the editor. Use the Form tab to fill supported existing fields. If the page has no fields, the toolbar’s More tools menu includes Text field and Checkbox. Place a field, set its Unique field name in Properties, and enter its answer in Form. Use distinct names such as customer_name and project_name; Folio rejects duplicate field names during export. The builder adds text fields and checkboxes, while the Form panel can also fill supported existing dropdown and radio choices.',
      links: [
        { label: 'Open the PDF form editor', href: '/create-pdf-form' },
        { label: 'Start with an original sample form', href: '/forms' },
      ],
    },
    {
      title: 'Export a completed copy with flattened fields',
      text: 'Flattening is an export choice in the editor. It uses the values currently entered in the Form panel. Existing field values in the original page preview do not update as you type, so inspect the downloaded copy to judge the actual result.',
      steps: [
        'Complete the supported fields in the Form panel, including the intended checkbox and selection values.',
        'Leave Flatten fields when exporting unchecked and download a fillable copy first if you need an editable backup.',
        'Check Flatten fields when exporting, then choose Download PDF to create the completed copy.',
        'Give the two downloads different names, such as inquiry-fillable.pdf and inquiry-completed.pdf.',
        'Open the completed copy in another PDF reader. Confirm the answers are visible and the former fields can no longer be filled.',
      ],
    },
    {
      title: 'Practice with the Project inquiry template',
      text: 'The Project inquiry sample is a short way to compare both outputs without uploading personal paperwork. Open it from Forms and enter a fictional name, a test email address and a project title in the Form panel. For example, use Alex Example, alex@example.com and Library display. Export once with flattening off and once with it on. Both copies should show those answers; only the fillable copy should offer interactive fields. Check a longer project title too, because text that fits in the side panel may be clipped in the PDF’s smaller field.',
      links: [{ label: 'Open the sample form gallery', href: '/forms' }],
    },
    {
      title: 'Fix empty, clipped or unresponsive form fields',
      text: 'Use the exported PDF to distinguish a preview limitation from a missing answer. If Folio reports no supported fields, the form may be flat, scanned or use a field structure it cannot fill. Adding Text is suitable for one fixed answer; Text field creates a control someone can fill later. A disabled existing field may be read-only. If a new field name conflicts, rename it in Properties. For clipped answers, enlarge a field you created or use a shorter accurate answer; check the recipient’s instructions before changing their form layout.',
    },
    {
      title: 'Flattening does not make a PDF tamper-proof',
      text: 'A flattened field is no longer interactive, but a PDF editor can still alter page content. Flattening does not encrypt the file, securely redact hidden information or verify a signature. Folio’s drawn, typed and image signatures are visual marks rather than certificate-based signing. Follow the recipient’s required signing process when one is specified. The form editor uploads the PDF and its draft to private cloud storage; download the copies you need before a guest workspace expires after 24 hours.',
      links: [
        { label: 'Choose a PDF signing workflow', href: '/guides/how-to-sign-a-pdf' },
        { label: 'See how editor files are saved', href: '/guides/does-folio-upload-pdf-files' },
      ],
    },
  ],
};
