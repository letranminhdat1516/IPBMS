import { Command } from 'lucide-react';

import {
  IconAlertTriangle,
  IconBrowserCheck,
  IconCreditCard,
  IconLayoutDashboard,
  IconMail,
  IconNurse,
  IconSettings,
  IconShield,
} from '@tabler/icons-react';

import { type SidebarData } from '../types';

export const sidebarData: SidebarData = {
  user: {
    name: 'foo',
    email: 'foo@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Vision AI Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI + React',
    },
  ],
  navGroups: [
    {
      title: 'Tổng quan',
      items: [{ title: 'Bảng điều khiển', url: '/', icon: IconLayoutDashboard }],
    },
    {
      title: 'Giám sát',
      items: [{ title: 'Phản hồi yêu cầu', url: '/ticket', icon: IconBrowserCheck }],
    },
    {
      title: 'Người dùng',
      items: [
        { title: 'Khách hàng', url: '/users/customer', icon: IconBrowserCheck },
        { title: 'Người chăm sóc', url: '/users/caregiver', icon: IconNurse },
        { title: 'Lời mời chăm sóc', url: '/caregiver-invitations', icon: IconBrowserCheck },
      ],
    },
    {
      title: 'Thanh toán',
      items: [
        { title: 'Gói đăng ký', url: '/subscriptions', icon: IconCreditCard },
        { title: 'Giao dịch', url: '/transactions', icon: IconCreditCard },
        // { title: 'Lịch sử thanh toán', url: '/billing-history', icon: IconCreditCard },
      ],
    },
    {
      title: 'Báo cáo & Nhắc nhở',
      items: [{ title: 'Nhắc nhở', url: '/alerts', icon: IconAlertTriangle }],
    },
    {
      title: 'Quản lý hệ thống',
      items: [
        { title: 'Vai trò & Quyền', url: '/roles_permissions', icon: IconShield },
        { title: 'Gói dịch vụ', url: '/plan', icon: IconCreditCard },
        { title: 'Nội dung email', url: '/email-templates', icon: IconMail },
        { title: 'Cấu hình hệ thống', url: '/configuration', icon: IconSettings },
        { title: 'Công cụ quản trị', url: '/admin-tools', icon: IconSettings },
      ],
    },
    {
      title: 'Khác',
      items: [{ title: 'Cài đặt', url: '/settings', icon: IconSettings }],
    },
  ],
};
