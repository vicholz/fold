class PdfWriter {
  constructor(pageWidthPt, pageHeightPt) {
    this.pageWidthPt = pageWidthPt;
    this.pageHeightPt = pageHeightPt;
    this.pages = [];
  }

  addJpegPage(bytes, imgWidth, imgHeight) {
    this.pages.push({
      bytes: bytes,
      imgWidth: imgWidth,
      imgHeight: imgHeight,
    });
  }

  compile() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length;
    };

    const catalogId = add(null);
    const pagesId = add(null);
    const pageIds = [];
    const imageIds = [];
    const contentIds = [];

    this.pages.forEach((page, index) => {
      const imageId = add(null);
      const contentId = add(null);
      const pageId = add(null);
      imageIds[index] = imageId;
      contentIds[index] = contentId;
      pageIds[index] = pageId;
    });

    objects[catalogId - 1] = "<< /Type /Catalog /Pages " + pagesId + " 0 R >>";
    objects[pagesId - 1] =
      "<< /Type /Pages /Kids [" +
      pageIds.map((id) => id + " 0 R").join(" ") +
      "] /Count " +
      pageIds.length +
      " >>";

    this.pages.forEach((page, index) => {
      const imageId = imageIds[index];
      const contentId = contentIds[index];
      const pageId = pageIds[index];
      const stream = "q " + this.pageWidthPt + " 0 0 " + this.pageHeightPt + " 0 0 cm /Im0 Do Q";
      objects[contentId - 1] = "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream";
      objects[pageId - 1] =
        "<< /Type /Page /Parent " +
        pagesId +
        " 0 R /MediaBox [0 0 " +
        this.pageWidthPt +
        " " +
        this.pageHeightPt +
        "] /Resources << /XObject << /Im0 " +
        imageId +
        " 0 R >> >> /Contents " +
        contentId +
        " 0 R >>";
      objects[imageId - 1] = {
        binary: true,
        header:
          "<< /Type /XObject /Subtype /Image /Width " +
          page.imgWidth +
          " /Height " +
          page.imgHeight +
          " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " +
          page.bytes.length +
          " >>\nstream\n",
        bytes: page.bytes,
        footer: "\nendstream",
      };
    });

    const encoder = new TextEncoder();
    const chunks = [];
    let offset = 0;
    const pushText = (text) => {
      const bytes = encoder.encode(text);
      chunks.push(bytes);
      offset += bytes.length;
    };
    const pushBytes = (bytes) => {
      chunks.push(bytes);
      offset += bytes.length;
    };

    pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");
    const xref = [0];
    objects.forEach((obj, i) => {
      xref[i + 1] = offset;
      pushText(i + 1 + " 0 obj\n");
      if (obj && obj.binary) {
        pushText(obj.header);
        pushBytes(obj.bytes);
        pushText(obj.footer + "\nendobj\n");
      } else {
        pushText(obj + "\nendobj\n");
      }
    });
    const xrefStart = offset;
    pushText("xref\n0 " + (objects.length + 1) + "\n");
    pushText("0000000000 65535 f \n");
    for (let i = 1; i <= objects.length; i++) {
      pushText(String(xref[i]).padStart(10, "0") + " 00000 n \n");
    }
    pushText(
      "trailer\n<< /Size " +
        (objects.length + 1) +
        " /Root 1 0 R >>\nstartxref\n" +
        xrefStart +
        "\n%%EOF"
    );

    let total = 0;
    chunks.forEach((chunk) => {
      total += chunk.length;
    });
    const out = new Uint8Array(total);
    let pos = 0;
    chunks.forEach((chunk) => {
      out.set(chunk, pos);
      pos += chunk.length;
    });
    return new Blob([out], { type: "application/pdf" });
  }
}
