import PolicyViewer from './PolicyViewer';
import privacyHtml from '../../public/privacy.html?raw';

export default function PrivacyPage() {
  return <PolicyViewer title="Privacy Policy" html={privacyHtml} backHref="#/" />;
}
