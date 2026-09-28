# How to Compress Images to a File Size Limit Without Guessing

By Folio Editorial

You choose a photo, press Upload, and see the same message again: “File is too large.” The picture looks perfectly ordinary on your screen, but the website wants something under 100 KB. Your phone saved it as a file several megabytes larger.

The useful next step is to work backwards from the upload requirements. You need an image that fits the size limit, uses an accepted format, and still has enough detail for its purpose. Repeatedly saving random lower-quality copies makes that harder to judge.

Folio’s [free image compressor](/compress-images) lets you choose a target file size before adding your images. It adjusts quality and, when needed, pixel dimensions, then shows the actual result. JPG, PNG, and WebP are supported. Processing happens in your browser, and Folio does not upload or save your images.

## The quickest way to compress an image to a KB limit

1. Read the destination’s requirements. Note the maximum file size, accepted format, and any required pixel dimensions.
2. Open Image compressor and select a size preset. For a different limit, enter it in Custom size (KB) and select Apply.
3. Choose an output format. Use JPG if the destination specifically asks for JPEG; use Auto when different formats are acceptable.
4. Choose files or drag your images onto the upload area, then select Compress images.
5. Compare Original and Result. Check the final file size and dimensions, then download the image or the batch ZIP.

The available presets are 10, 15, 20, 30, 40, 50, 100, 200, and 500 KB, plus 1 MB. A custom target can be any number from 1 to 35,000 KB, including up to three decimal places. The displayed current limit confirms what you applied. Changing a preset or applying another setting clears the old results, so run compression again to create the new version.

## File size and image dimensions are different requirements

File size tells you how much data the image contains. Pixel dimensions describe the width and height of the picture. A 100 KB file can be wide or narrow, and two photos with the same dimensions can have very different file sizes. Fine texture, image noise, and the chosen format all affect how much data is needed.

For example, imagine a form requires a JPG below 100 KB and at least 400 pixels wide. Reaching 100 KB is only part of the task. If the compressed result is 300 pixels wide, it still fails the form’s rules. Folio shows the original and output dimensions beside the preview so you can catch this before uploading.

Target mode can reduce dimensions to reach a smaller file size. If the destination requires exact dimensions, start with an image prepared at those dimensions and try Manual settings with Keep original dimensions. Adjust JPG or WebP quality there, then check the resulting bytes. Manual mode does not guarantee a particular file size.

## Choose a useful target instead of the smallest possible file

A smaller number is not automatically a better result. A small avatar may remain useful at a size that makes a receipt impossible to read. Begin with the largest file the destination allows, then reduce further only when there is a reason. Keep your original separately so you can start again without compressing an already compressed copy.

| Situation                                       | A useful starting point                                                                    | Check before using it                                                       |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| A form with a 20 KB or 50 KB limit              | Choose the matching preset and the exact format the form accepts.                          | Make sure required dimensions and important facial or text details survive. |
| A photo limited to 100 KB or 200 KB             | Use that limit first rather than jumping straight to 10 KB.                                | Inspect the subject, edges, and any required identifying details.           |
| A website or email image without a strict limit | Choose dimensions suited to where the image will appear, then compare formats and quality. | Check it at its intended display size, not just as a tiny preview.          |
| A screenshot, receipt, or diagram               | Allow enough space for small text and lines; compare a PNG result.                         | Zoom in on the smallest text you actually need to read.                     |

These are workflow examples, not promises that a particular size will suit every image. A detailed photo and a simple logo can respond very differently to the same target.

## JPG, PNG, WebP, or Auto: which should you choose?

### JPG when the destination requires it or the image is a photograph

JPG is a practical choice for photographs and for forms that list JPEG as an accepted format. Lower quality can reduce the file size, but fine detail may soften and edges may show artifacts. JPG does not preserve a transparent background; Folio fills transparent areas with white when you choose it.

### PNG when clear graphics or transparency matter

PNG is useful for graphics, screenshots, and images with transparent areas. Its encoding is lossless, but that does not mean every size-target operation leaves the source unchanged. To reach a small limit, Folio may reduce the number of pixels. A PNG can therefore remain losslessly encoded while the resized picture contains less detail.

The browser’s quality control applies to formats such as JPG and WebP, rather than PNG. [MDN’s canvas export documentation](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas/convertToBlob) explains this distinction. In Manual settings, lowering the JPG / WEBP quality slider will not make PNG encoding more aggressive.

### WebP when the receiving app accepts it

WebP can be useful for compact photos and graphics, including images with transparency. [Google’s WebP documentation](https://developers.google.com/speed/webp) describes its support for lossy and lossless compression and transparent pixels. Folio’s WebP quality setting uses lossy compression. Check the destination’s accepted file types before choosing it; a small WebP is not useful if the upload form only accepts JPG.

### Auto when you want the tool to compare formats

Auto compares supported output formats and chooses a smaller result that meets the limit at the tested dimensions. It avoids JPG when the source has transparent pixels. The file extension can change, so check the format shown with your result. If the original already fits the target, Auto can keep it unchanged instead of reducing its quality unnecessarily.

## What a target-size compressor actually changes

In target mode, Folio tries quality settings and measures the encoded file, rather than guessing its size from a percentage slider. If an image still exceeds the limit, it tries smaller dimensions while keeping the same proportions. For PNG, reducing dimensions is the available route when its lossless output is too large.

A successful result is at or below the selected byte limit. It is not padded to reach an exact number. If the tool cannot produce a result within the limit, it reports a problem rather than labelling an oversized file as ready. You can then choose another format or a larger target where the destination allows it.

Folio’s targets use decimal units: 1 KB means 1,000 bytes, and the 1 MB preset means 1,000,000 bytes. Some operating systems display file sizes using a different convention or round the number. Use the exact byte count shown beside the result when comparing it with a strict limit.

## Check quality where it matters

Switch between Original and Result before downloading. For a photograph, inspect the main subject and high-contrast edges. For a receipt, check the date, total, and small print you need. For a logo, inspect thin strokes and the transparent outline against the checkerboard preview.

A fit-to-screen preview can hide lost detail. Open the downloaded file at normal viewing size, and zoom in if it contains important text. If it looks muddy or the letters merge together, try a larger limit, a different format, or a cleaner source. Compression cannot bring back detail that was missing or out of focus in the original.

## Compress several images and keep the batch manageable

You can add up to 20 images in one batch, with a 35 MB limit per image and a 150 MB total limit. Decoded images must contain no more than 25 million pixels. Drag and drop works alongside Choose files, and Add images lets you extend the batch after the first selection.

The target applies to each image individually. A ZIP containing ten images may be much larger than the limit selected for one image, and an upload form may not accept ZIP files at all. Use Download this image for a single result, or Download all (ZIP) to collect the successful batch outputs.

If one file is damaged, check its error in the preview area. Other successfully processed files can still be downloaded. Remove the problem file or replace it with a valid original, then run the batch again. Cancel processing stops the current work; Clear all discards the selected images and results.

## Why an upload can still be rejected

| Problem                                      | What may be happening                                                  | What to try                                                                                  |
| -------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| The website says the file is too large       | You may be selecting the original, an old download, or the entire ZIP. | Choose the latest individual result and compare its exact byte count with the limit.         |
| The website rejects the format               | Auto produced a type that the destination does not accept.             | Select the required output format explicitly and compress again.                             |
| The dimensions are wrong                     | Target mode reduced the pixel dimensions while meeting the size limit. | Use a source with the required proportions and try Manual settings with original dimensions. |
| The image looks worse after several attempts | A previously compressed download was used as the next source.          | Return to the original file for each new attempt.                                            |
| A transparent area became white              | The result was exported as JPG.                                        | Choose PNG or WebP if the destination supports transparency.                                 |
| An animated image became still               | Re-encoding produced one frame.                                        | Use a tool designed for animation if motion must be preserved.                               |

## What happens to your images after compression?

The compressor holds the selected files and results in the current browser tab’s memory. It does not upload those images to Folio, save them to your account, or write them to browser storage. You can use it without signing in. The website still requests scripts and other assets over the network.

Clear all or refresh to discard the batch. Downloaded images and ZIPs remain on your device; clearing the page does not remove those copies. Read [Folio’s privacy details](/privacy) if you also use the PDF editor, which has a separate cloud-saving workflow.

Compression is not a guarantee of metadata removal. An original that already fits the requested settings may be returned unchanged, including its existing metadata. If removing location or camera information is your goal, use a process specifically designed for that and verify the saved file.

## Common questions about image compression

### Can I compress an image without losing quality?

Sometimes an image can be stored more efficiently, and an already-small original may be kept unchanged. A strict target can require lossy encoding or fewer pixels, though. Compare the result rather than relying on a universal “no quality loss” promise.

### Can I use a custom target such as 75 KB?

Yes. Enter 75 in Custom size (KB), select Apply, and confirm that the current limit shows 75.0 KB. That applies a maximum of 75,000 bytes to each image in the next run.

### Are compression and downloads free?

Yes. Folio’s image compressor and individual or ZIP downloads are free. There is no account requirement or Folio watermark added to the exported image.

### Will changing a file extension convert the image?

No. Renaming photo.webp to photo.jpg does not change its encoding. Select JPG as the output format and download the newly encoded file instead.

Start with the upload requirements, choose a sensible size, and inspect the result once at the size that matters. Then [compress your images in Folio](/compress-images) and download the version you intend to use. Keep the original until you know the destination accepts the new file.

---

Cover photograph by [Christin Hume](https://unsplash.com/photos/person-using-laptop-computer-Hcfwew744z4) on Unsplash.
