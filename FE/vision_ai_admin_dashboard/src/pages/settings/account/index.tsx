import ContentSection from '../components/content-section';
import { AccountForm } from './account-form';

export default function SettingsAccount() {
  return (
    <ContentSection
      title='Tài khoản'
      desc='Cập nhật cài đặt tài khoản. Chọn ngôn ngữ hiển thị và múi giờ.'
    >
      <AccountForm />
    </ContentSection>
  );
}
