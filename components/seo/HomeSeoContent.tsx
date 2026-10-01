import Link from "next/link";

/**
 * Server-rendered homepage copy for crawlers and no-JS clients.
 * Visually hidden; interactive landing UI remains client-rendered.
 */
export default function HomeSeoContent() {
  return (
    <section className="seo-prerender" aria-label="About StayLokal">
      <h1>Offline privacy-first browser-based file tools</h1>
      <p>
        StayLokal at staylokal.app is a privacy-first PWA file toolkit built by @strykerin. Convert, compress,
        edit, and export PDFs, images, video, audio, documents, and ZIP archives in your browser with no upload and
        no account—processing stays on your device, offline-friendly after install.
      </p>
      <p>Transform your files, without the cloud.</p>
      <h2>What you can do</h2>
      <ul>
        <li>PDF: merge, split, compress, rotate, OCR, forms, signatures, redaction, and more.</li>
        <li>Image: resize, crop, convert, background removal, upscale, watermark, and contact sheets.</li>
        <li>Video and audio: trim, convert, compress, metadata removal, and waveform editing.</li>
        <li>Documents: DOC/DOCX/PPT/PPTX text, spreadsheets, JSON, Base64, hashing, and ZIP tools.</li>
      </ul>
      <h2>How StayLokal works</h2>
      <ol>
        <li>Drop or choose files from your device.</li>
        <li>Pick a compatible tool—processing runs locally in the browser.</li>
        <li>Download results instantly; nothing is uploaded for file processing.</li>
      </ol>
      <p>
        Optional donations and sponsor leaderboard placements use server checkout; working files stay local.
      </p>
      <nav aria-label="StayLokal site links">
        <Link href="/tools">All tools</Link>
        <Link href="/#sponsors">Sponsor</Link>
        <Link href="/donate">Donate</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/rules">Sponsor rules</Link>
      </nav>
    </section>
  );
}
