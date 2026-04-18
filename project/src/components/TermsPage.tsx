import PolicyViewer from './PolicyViewer';
import termsHtml from '../../public/terms.html?raw';

export default function TermsPage() {
  return <PolicyViewer title="Terms of Service" html={termsHtml} backHref="#/" />;
}
