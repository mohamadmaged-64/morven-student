import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import type { CvData } from './types';
import type { CvTemplate, CvTemplateColors } from './templates';
import type { CvLanguage } from './cvLabels';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

interface LinkRect {
  xPx: number;
  yPx: number;
  wPx: number;
  hPx: number;
  url: string;
}

function captureLinks(el: HTMLElement): LinkRect[] {
  const links = el.querySelectorAll('a[href]');
  const containerRect = el.getBoundingClientRect();
  const results: LinkRect[] = [];
  links.forEach((a) => {
    const href = (a as HTMLAnchorElement).href;
    if (!href) return;
    const r = a.getBoundingClientRect();
    results.push({
      xPx: r.left - containerRect.left,
      yPx: r.top - containerRect.top + el.scrollTop,
      wPx: r.width,
      hPx: r.height,
      url: href,
    });
  });
  return results;
}

export async function generateCvPdf(
  cvData: CvData,
  template: CvTemplate,
  previewRef: React.RefObject<HTMLDivElement | null>,
  colors: CvTemplateColors,
  language: CvLanguage,
): Promise<void> {
  const livePreview = previewRef.current;
  if (!livePreview) {
    throw new Error('CV preview element not found');
  }

  await document.fonts.ready;

  const linkRects = captureLinks(livePreview);

  const wrapper = livePreview.parentElement!;

  const savedWrapperOverflow = wrapper.style.overflow;
  const savedWrapperClip = wrapper.style.clipPath;
  const savedLiveTransform = livePreview.style.transform;
  const savedLiveOrigin = livePreview.style.transformOrigin;

  wrapper.style.overflow = 'visible';
  wrapper.style.clipPath = 'none';
  livePreview.style.transform = 'none';
  livePreview.style.transformOrigin = 'top start';

  await new Promise(r => setTimeout(r, 200));

  try {
    const dataUrl = await toPng(livePreview, {
      pixelRatio: 2,
      backgroundColor: colors.bgColor || '#ffffff',
      cacheBust: true,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
    });

    const imgWidthPx = img.naturalWidth;
    const imgHeightPx = img.naturalHeight;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pxPerMm = imgWidthPx / A4_WIDTH_MM;
    const pdfContentHeightPx = A4_HEIGHT_MM * pxPerMm;

    let yOffset = 0;
    let page = 0;

    while (yOffset < imgHeightPx) {
      if (page > 0) {
        pdf.addPage();
      }

      const sliceHeight = Math.min(pdfContentHeightPx, imgHeightPx - yOffset);

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext('2d');

      if (ctx) {
        ctx.drawImage(img, 0, yOffset, imgWidthPx, sliceHeight, 0, 0, imgWidthPx, sliceHeight);
        const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(pageImgData, 'JPEG', 0, 0, A4_WIDTH_MM, sliceHeight / pxPerMm);
      }

      linkRects.forEach((lr) => {
        const linkTopPx = lr.yPx;
        const linkBottomPx = lr.yPx + lr.hPx;
        if (linkBottomPx <= yOffset || linkTopPx >= yOffset + sliceHeight) return;

        const clippedTop = Math.max(0, linkTopPx - yOffset);
        const clippedBottom = Math.min(sliceHeight, linkBottomPx - yOffset);

        const xMm = lr.xPx / pxPerMm;
        const yMm = clippedTop / pxPerMm;
        const wMm = lr.wPx / pxPerMm;
        const hMm = (clippedBottom - clippedTop) / pxPerMm;

        if (wMm > 0 && hMm > 0) {
          pdf.link(xMm, yMm, wMm, hMm, { url: lr.url });
        }
      });

      yOffset += pdfContentHeightPx;
      page++;
    }

    const fileName = cvData.personalInfo.fullName
      ? `${cvData.personalInfo.fullName.replace(/\s+/g, '_')}_CV.pdf`
      : 'CV.pdf';
    pdf.save(fileName);
  } finally {
    livePreview.style.transform = savedLiveTransform;
    livePreview.style.transformOrigin = savedLiveOrigin;
    wrapper.style.overflow = savedWrapperOverflow;
    wrapper.style.clipPath = savedWrapperClip;
  }
}
