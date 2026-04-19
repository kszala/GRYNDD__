import PolicyViewer from './PolicyViewer';
import contactHtml from '../../public/contact.html?raw';

export default function ContactPage() {
  return <PolicyViewer title="Contact Us" html={contactHtml} backHref="#/" />;
}