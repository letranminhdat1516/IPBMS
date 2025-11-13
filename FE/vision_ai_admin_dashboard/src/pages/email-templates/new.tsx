// email-templates/new.tsx
import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useCreateEmailTemplate } from '@/services/emailTemplates';

import { EmailTemplateForm } from './components/email-template-form';
import type { EmailTemplateFormData } from './utils/types';

export default function NewEmailTemplatePage() {
  const navigate = useNavigate();

  const createMutation = useCreateEmailTemplate();

  const handleSubmit = (data: EmailTemplateFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        navigate({ to: '/email-templates' });
      },
    });
  };

  const handleCancel = () => {
    navigate({ to: '/email-templates' });
  };

  const isMutationLoading = createMutation.isPending;

  return (
    <Main className='space-y-6'>
      <Header>
        <div>
          <h1 className='text-3xl font-bold'>Tạo Template Email Mới</h1>
          <p className='text-muted-foreground'>Tạo template email mới với HTML và text versions</p>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <div className='mx-auto max-w-6xl'>
        <EmailTemplateForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isMutationLoading}
        />
      </div>
    </Main>
  );
}
