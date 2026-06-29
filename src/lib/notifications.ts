import { getServiceClient } from '@/lib/supabase'

type NotificationType = 'new_lead' | 'status_changed' | 'follow_up_set' | 'broker_assigned' | 'follow_up_reminder'

export async function createNotification(params: {
  companyId: string
  type: NotificationType
  title: string
  body: string
  href?: string
}) {
  const supabase = getServiceClient()
  const { error } = await supabase.from('notifications').insert({
    company_id: params.companyId,
    type:       params.type,
    title:      params.title,
    body:       params.body,
    href:       params.href ?? '/dashboard/leads',
  })
  if (error) console.error('[createNotification]', error.message)
}
