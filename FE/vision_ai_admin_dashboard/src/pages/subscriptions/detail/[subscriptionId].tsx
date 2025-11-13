import { Link, useParams } from '@tanstack/react-router';

import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { useSubscription } from '@/hooks/use-subscriptions';

import { maskId, maskName } from '@/lib/utils';

export default function SubscriptionDetail() {
  const { subscriptionId } = useParams({
    from: '/_authenticated/subscriptions/$subscriptionId',
  });
  const { data: subscription, isLoading, isError } = useSubscription(subscriptionId);

  if (isLoading) {
    return (
      <Main className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground'>Đang tải thông tin subscription…</div>
      </Main>
    );
  }

  if (isError || !subscription) {
    return (
      <Main className='flex h-full items-center justify-center'>
        <div className='text-muted-foreground'>Không tìm thấy subscription.</div>
      </Main>
    );
  }

  return (
    <>
      <Header fixed />
      <Main>
        <div className='mx-auto max-w-4xl space-y-6'>
          <div className='text-muted-foreground flex items-center gap-2 text-sm'>
            <Link to='/' className='hover:text-foreground'>
              Trang chủ
            </Link>
            <span>/</span>
            <Link to='/subscriptions' className='hover:text-foreground'>
              Subscriptions
            </Link>
            <span>/</span>
            <span className='text-foreground'>{maskId(subscription.subscription_id)}</span>
          </div>
          <div className='flex items-center justify-between'>
            <h1 className='text-2xl font-bold'>Chi tiết Subscription</h1>
            <div className='flex gap-2'>
              <Button variant='outline' onClick={() => history.back()} className='hover:bg-muted'>
                Quay lại
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Thông tin Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div>
                  <div className='text-muted-foreground text-xs'>ID</div>
                  <div className='text-sm font-medium'>{maskId(subscription.subscription_id)}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>User</div>
                  <div className='text-sm'>
                    {subscription.user ? maskName(subscription.user.full_name) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Plan</div>
                  <div className='text-sm'>
                    {subscription.plans ? subscription.plans.name : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Status</div>
                  <div className='text-sm capitalize'>{subscription.status}</div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>Start Date</div>
                  <div className='text-sm'>
                    {new Date(subscription.started_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className='text-muted-foreground text-xs'>End Date</div>
                  <div className='text-sm'>
                    {subscription.current_period_end
                      ? new Date(subscription.current_period_end).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
              <Separator className='my-6' />
              <div className='text-muted-foreground text-xs'>Created At</div>
              <div className='text-sm'>{new Date(subscription.started_at).toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}
