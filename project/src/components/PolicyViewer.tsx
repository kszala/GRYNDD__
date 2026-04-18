import type { ReactNode } from 'react';

interface PolicyViewerProps {
  title: string;
  html: string;
  backHref?: string;
}

export default function PolicyViewer({ title, html, backHref = '#/' }: PolicyViewerProps) {
  return (
    <div className="min-h-screen bg-[#060608] text-[#E8E8E6]">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <a
          href={backHref}
          className="text-sm text-[#9CA3AF] hover:text-[#E8E8E6] transition"
        >
          ← Back
        </a>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      </div>
      <div className="w-full min-h-[calc(100vh-96px)]">
        <iframe
          title={title}
          srcDoc={html}
          style={{
            width: '100%',
            minHeight: '100%',
            border: '0',
            backgroundColor: '#060608',
          }}
        />
      </div>
    </div>
  );
}
