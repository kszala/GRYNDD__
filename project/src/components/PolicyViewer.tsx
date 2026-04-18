interface PolicyViewerProps {
  title: string;
  html: string;
  backHref?: string;
}

function extractHtmlFragments(rawHtml: string) {
  const cleaned = rawHtml.replace(/<!doctype html>/i, '');
  const headMatch = cleaned.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const headContent = headMatch?.[1] ?? '';
  const bodyContent = bodyMatch?.[1] ?? cleaned;

  const styleFragments = [
    ...(headContent.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []),
    ...(headContent.match(/<link[^>]*>/gi) ?? []),
  ].join('\n');

  return {
    headFragments: styleFragments,
    bodyContent,
  };
}

export default function PolicyViewer({ title, html, backHref = '#/' }: PolicyViewerProps) {
  const { headFragments, bodyContent } = extractHtmlFragments(html);

  return (
    <div className="min-h-screen bg-[#060608] text-[#E8E8E6]">
      <div dangerouslySetInnerHTML={{ __html: headFragments }} />
      <div className="max-w-6xl mx-auto px-4 py-6">
        <a
          href={backHref}
          className="text-sm text-[#9CA3AF] hover:text-[#E8E8E6] transition"
        >
          ← Back
        </a>
        <h1 className="mt-4 text-3xl font-semibold">{title}</h1>
      </div>
      <div className="w-full px-4 pb-20" style={{ minHeight: 'calc(100vh - 96px)' }}>
        <div dangerouslySetInnerHTML={{ __html: bodyContent }} />
      </div>
    </div>
  );
}
