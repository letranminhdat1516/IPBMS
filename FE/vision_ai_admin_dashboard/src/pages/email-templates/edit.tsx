import { useNavigate, useParams } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { useEmailTemplate, useUpdateEmailTemplate } from '@/services/emailTemplates';

import { EmailTemplateForm } from './components/email-template-form';
import type { EmailTemplateFormData } from './utils/types';

export default function EditEmailTemplatePage() {
  const { templateId } = useParams({ from: '/_authenticated/email-templates/edit/$templateId' });
  const navigate = useNavigate();

  const { data: template, isLoading } = useEmailTemplate(templateId!);

  const updateMutation = useUpdateEmailTemplate();

  const handleSubmit = (data: EmailTemplateFormData) => {
    updateMutation.mutate(
      { templateId: templateId!, data },
      {
        onSuccess: () => {
          navigate({ to: '/email-templates' });
        },
      }
    );
  };

  const handleCancel = () => {
    navigate({ to: '/email-templates' });
  };

  const isMutationLoading = updateMutation.isPending;

  if (isLoading) {
    return (
      <Main>
        <div>Loading...</div>
      </Main>
    );
  }

  return (
    <Main className='space-y-6'>
      <Header>
        <div>
          <h1 className='text-3xl font-bold'>Chỉnh Sửa Template Email</h1>
          <p className='text-muted-foreground'>Chỉnh sửa template email hiện tại</p>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <div className='mx-auto max-w-6xl'>
        <EmailTemplateForm
          template={template}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={isMutationLoading}
        />
      </div>
    </Main>
  );
}
