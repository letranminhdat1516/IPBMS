import React from 'react';

import { useNavigate } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { EmailTemplatesFilters, EmailTemplatesList } from './components';
import type { EmailTemplate } from './utils/types';

export default function EmailTemplatesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');

  const handleCreateNew = () => {
    navigate({ to: '/email-templates/new' });
  };

  const handleEdit = (template: EmailTemplate) => {
    navigate({ to: `/email-templates/edit/${template.id}` });
  };

  return (
    <Main className='space-y-6'>
      <Header>
        <div>
          <h1 className='text-3xl font-bold'>Email Templates</h1>
          <p className='text-muted-foreground'>
            Quản lý các template email với HTML và text versions
          </p>
        </div>
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Templates</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <EmailTemplatesFilters
            search={search}
            onSearchChange={setSearch}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            onCreateNew={handleCreateNew}
          />

          <EmailTemplatesList
            search={search}
            typeFilter={typeFilter}
            statusFilter={statusFilter}
            onEdit={handleEdit}
          />
        </CardContent>
      </Card>
    </Main>
  );
}
