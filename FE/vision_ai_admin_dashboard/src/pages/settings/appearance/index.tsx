import ContentSection from '../components/content-section';
import { AppearanceForm } from './appearance-form';

export default function SettingsAppearance() {
  return (
    <ContentSection
      title='Giao diện'
      desc='Tùy chỉnh giao diện ứng dụng. Tự động chuyển giữa giao diện sáng và tối.'
    >
      <AppearanceForm />
    </ContentSection>
  );
}
