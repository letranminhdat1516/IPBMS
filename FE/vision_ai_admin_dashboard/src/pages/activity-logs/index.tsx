/**
 * TRANG NHẬT KÝ HOẠT ĐỘNG - Activity Logs Page
 *
 * Mô tả tổng quan:
 * Component này hiển thị danh sách nhật ký hoạt động của hệ thống với các tính năng:
 * - Lọc theo người thực hiện, hành động, và tài nguyên
 * - Phân trang phía client
 * - Hiển thị thông tin chi tiết của từng nhật ký
 * - Giao diện tiếng Việt hoàn chỉnh
 *
 * Luồng hoạt động:
 * 1. Fetch dữ liệu từ API sử dụng TanStack Query
 * 2. Lọc dữ liệu phía client dựa trên các bộ lọc đã chọn
 * 3. Phân trang dữ liệu đã lọc
 * 4. Render danh sách nhật ký với thông tin chi tiết
 * 5. Xử lý các trạng thái loading, error, và empty state
 */
import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { PaginationBar } from '@/components/pagination-bar';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';

import { formatDateTimeVN } from '@/utils/date';

import { getActivityLogs } from '@/services/auditLog';

// Bước 1: Import các thư viện và component cần thiết
// - React hooks: useState để quản lý state
// - TanStack Query: useQuery để fetch dữ liệu từ API
// - UI Components: Các component giao diện người dùng
// - Service: getActivityLogs để gọi API lấy nhật ký hoạt động

const DEFAULT_PAGE_SIZE = 20; // Số lượng item hiển thị trên mỗi trang

export default function ActivityLogsPage() {
  // Bước 2: Khai báo các state để quản lý trạng thái của trang
  // - page: Trang hiện tại đang xem
  // - actorFilter: Bộ lọc theo người thực hiện
  // - actionFilter: Bộ lọc theo hành động
  // - resourceFilter: Bộ lọc theo tài nguyên
  const [page, setPage] = useState(1);
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  // Bước 3: Xử lý sự kiện thay đổi bộ lọc
  // Khi người dùng thay đổi bộ lọc, reset về trang đầu tiên
  const handleActorFilterChange = (value: string) => {
    setActorFilter(value);
    setPage(1); // Reset về trang 1 khi thay đổi bộ lọc
  };

  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1); // Reset về trang 1 khi thay đổi bộ lọc
  };

  const handleResourceFilterChange = (value: string) => {
    setResourceFilter(value);
    setPage(1); // Reset về trang 1 khi thay đổi bộ lọc
  };

  // Bước 4: Fetch dữ liệu từ API sử dụng TanStack Query
  // - queryKey: Key để cache dữ liệu
  // - queryFn: Hàm gọi API để lấy dữ liệu
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: () => getActivityLogs(),
  });

  // Bước 5: Chuẩn bị dữ liệu
  // - logs: Mảng chứa tất cả nhật ký hoạt động từ API
  // - Nếu API trả về null/undefined, sử dụng mảng rỗng
  const logs = data || [];

  // Bước 6: Lọc dữ liệu phía client
  // Áp dụng các bộ lọc đã chọn để lọc ra các nhật ký phù hợp
  const filteredLogs = logs.filter((log) => {
    // Kiểm tra điều kiện lọc theo người thực hiện
    const matchesActor = actorFilter === 'all' || log.actor_name === actorFilter;
    // Kiểm tra điều kiện lọc theo hành động
    const matchesAction = actionFilter === 'all' || log.action_enum === actionFilter;
    // Kiểm tra điều kiện lọc theo tài nguyên
    const matchesResource = resourceFilter === 'all' || log.resource_type === resourceFilter;
    // Chỉ trả về true nếu tất cả điều kiện đều thỏa mãn
    return matchesActor && matchesAction && matchesResource;
  });

  // Bước 7: Tính toán tổng số item sau khi lọc
  const total = filteredLogs.length;

  // Bước 8: Phân trang phía client
  // Tính toán vị trí bắt đầu và kết thúc của trang hiện tại
  const startIndex = (page - 1) * DEFAULT_PAGE_SIZE;
  const endIndex = startIndex + DEFAULT_PAGE_SIZE;
  // Lấy ra các item của trang hiện tại từ mảng đã lọc
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Bước 9: Chuẩn bị dữ liệu cho các tùy chọn bộ lọc
  // Tạo danh sách các người thực hiện duy nhất từ tất cả nhật ký
  const uniqueActors = Array.from(
    new Set(logs.map((log) => log.actor_name).filter(Boolean)) // Loại bỏ giá trị null/undefined
  ).sort(); // Sắp xếp theo thứ tự alphabet

  // Tạo danh sách các hành động duy nhất từ tất cả nhật ký
  const uniqueActions = Array.from(
    new Set(logs.map((log) => log.action_enum).filter(Boolean)) // Loại bỏ giá trị null/undefined
  ).sort(); // Sắp xếp theo thứ tự alphabet

  // Bước 10: Hàm xác định màu sắc cho badge hành động
  // Dựa trên loại hành động để chọn màu phù hợp
  const getActionBadgeVariant = (actionEnum: string) => {
    switch (actionEnum) {
      case 'create':
        return 'default'; // Màu xanh cho hành động tạo mới
      case 'update':
        return 'secondary'; // Màu xám cho hành động cập nhật
      case 'delete':
        return 'destructive'; // Màu đỏ cho hành động xóa
      case 'login':
      case 'logout':
        return 'outline'; // Màu viền cho hành động đăng nhập/đăng xuất
      default:
        return 'outline'; // Mặc định là màu viền
    }
  };

  return (
    <>
      {/* Bước 11: Render Header với các component điều hướng */}
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      {/* Bước 12: Render phần nội dung chính */}
      <Main>
        {/* Bước 13: Header của trang với tiêu đề và mô tả */}
        <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Nhật ký hoạt động</h2>
            <p className='text-muted-foreground'>
              Theo dõi tất cả hoạt động của người dùng và sự kiện hệ thống
            </p>
          </div>

          {/* Bước 14: Các bộ lọc để tìm kiếm nhật ký */}
          <div className='flex gap-2'>
            {/* Bộ lọc theo người thực hiện */}
            <Select value={actorFilter} onValueChange={handleActorFilterChange}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Lọc theo người thực hiện' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả người thực hiện</SelectItem>
                {/* Render danh sách người thực hiện duy nhất */}
                {uniqueActors.map((actor) => (
                  <SelectItem key={actor} value={actor}>
                    {actor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bộ lọc theo hành động */}
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Lọc theo hành động' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả hành động</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action === 'create'
                      ? 'Tạo mới'
                      : action === 'update'
                        ? 'Cập nhật'
                        : action === 'delete'
                          ? 'Xóa'
                          : action === 'login'
                            ? 'Đăng nhập'
                            : action === 'logout'
                              ? 'Đăng xuất'
                              : action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Bộ lọc theo tài nguyên */}
            <Select value={resourceFilter} onValueChange={handleResourceFilterChange}>
              <SelectTrigger className='w-40'>
                <SelectValue placeholder='Lọc theo tài nguyên' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>Tất cả tài nguyên</SelectItem>
                <SelectItem value='user'>Người dùng</SelectItem>
                <SelectItem value='camera'>Camera</SelectItem>
                <SelectItem value='auth'>Xác thực</SelectItem>
                <SelectItem value='ai_configuration'>Cấu hình AI</SelectItem>
                <SelectItem value='notification'>Thông báo</SelectItem>
                <SelectItem value='payment'>Thanh toán</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bước 15: Card chứa danh sách nhật ký hoạt động */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Bước 16: Xử lý các trạng thái loading và error */}
            {isError ? (
              // Hiển thị thông báo lỗi khi không thể tải dữ liệu
              <div className='text-muted-foreground py-8 text-center'>
                Không thể tải nhật ký hoạt động
              </div>
            ) : isLoading ? (
              // Hiển thị loading khi đang fetch dữ liệu
              <div className='text-muted-foreground py-8 text-center'>Đang tải...</div>
            ) : logs.length === 0 ? (
              // Hiển thị thông báo khi không có dữ liệu
              <div className='text-muted-foreground py-8 text-center'>
                Không tìm thấy nhật ký hoạt động nào
              </div>
            ) : (
              // Bước 17: Render danh sách nhật ký hoạt động
              <div className='space-y-4'>
                {/* Duyệt qua từng nhật ký trong trang hiện tại */}
                {paginatedLogs.map((log, index) => (
                  <div
                    key={index}
                    className='hover:bg-muted/50 flex items-start gap-4 rounded-lg border p-4'
                  >
                    <div className='flex-1 space-y-2'>
                      {/* Bước 18: Header của mỗi nhật ký với badges và thông tin cơ bản */}
                      <div className='flex items-center gap-2'>
                        {/* Badge hiển thị loại hành động */}
                        <Badge variant={getActionBadgeVariant(log.action_enum)}>{log.action}</Badge>

                        {/* Badge hiển thị mức độ nghiêm trọng */}
                        <Badge
                          variant={
                            log.severity === 'high'
                              ? 'destructive' // Đỏ cho mức cao
                              : log.severity === 'medium'
                                ? 'secondary' // Xám cho mức trung bình
                                : 'outline' // Viền cho mức thấp/thông tin
                          }
                          className='text-xs'
                        >
                          {log.severity === 'high'
                            ? 'Cao'
                            : log.severity === 'medium'
                              ? 'Trung bình'
                              : log.severity === 'low'
                                ? 'Thấp'
                                : log.severity === 'info'
                                  ? 'Thông tin'
                                  : log.severity}
                        </Badge>

                        {/* Thông tin người thực hiện */}
                        <span className='text-muted-foreground text-sm'>bởi {log.actor_name}</span>

                        {/* ID người thực hiện (nếu có) */}
                        {log.actor_id && (
                          <span className='text-muted-foreground text-xs'>
                            (ID: {log.actor_id})
                          </span>
                        )}

                        {/* Thời gian thực hiện */}
                        <span className='text-muted-foreground text-sm'>
                          {formatDateTimeVN(log.timestamp)}
                        </span>
                      </div>

                      {/* Bước 19: Thông điệp của nhật ký (nếu có) */}
                      {log.message && (
                        <p className='text-muted-foreground text-sm'>
                          {typeof log.message === 'string'
                            ? log.message
                            : typeof log.message === 'object'
                              ? JSON.stringify(log.message, null, 2)
                              : String(log.message)}
                        </p>
                      )}

                      {/* Bước 20: Thông tin chi tiết bổ sung */}
                      <div className='text-muted-foreground flex flex-wrap items-center gap-4 text-xs'>
                        {/* Địa chỉ IP */}
                        <span>Địa chỉ IP: {log.ip}</span>

                        {/* Thông tin tài nguyên (nếu có) */}
                        {log.resource_type && (
                          <div className='flex items-center gap-2'>
                            {/* Badge loại tài nguyên */}
                            <Badge variant='outline' className='text-xs'>
                              {log.resource_type === 'user'
                                ? 'Người dùng'
                                : log.resource_type === 'camera'
                                  ? 'Camera'
                                  : log.resource_type === 'auth'
                                    ? 'Xác thực'
                                    : log.resource_type === 'ai_configuration'
                                      ? 'Cấu hình AI'
                                      : log.resource_type === 'notification'
                                        ? 'Thông báo'
                                        : log.resource_type === 'payment'
                                          ? 'Thanh toán'
                                          : log.resource_type}
                            </Badge>

                            {/* Tên tài nguyên (nếu có) */}
                            {log.resource_name && (
                              <span className='text-muted-foreground'>
                                Tên: {log.resource_name}
                              </span>
                            )}

                            {/* ID tài nguyên (nếu có) */}
                            {log.resource_id && (
                              <span className='text-muted-foreground'>Mã: {log.resource_id}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Bước 21: Component phân trang */}
                <PaginationBar
                  page={page} // Trang hiện tại
                  pageSize={DEFAULT_PAGE_SIZE} // Số item mỗi trang
                  total={total} // Tổng số item sau khi lọc
                  onPageChange={setPage} // Hàm xử lý thay đổi trang
                />
              </div>
            )}
          </CardContent>
        </Card>
      </Main>
    </>
  );
}
