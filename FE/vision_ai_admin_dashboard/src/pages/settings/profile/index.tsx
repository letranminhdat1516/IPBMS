import ContentSection from '../components/content-section';
import ProfileForm from './profile-form';

export default function SettingsProfile() {
  return (
    <ContentSection title='Hồ sơ' desc='Đây là thông tin mà người khác sẽ thấy trên trang.'>
      <ProfileForm />
    </ContentSection>
  );
}
