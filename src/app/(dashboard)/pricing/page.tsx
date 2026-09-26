import { createClient } from '@/lib/supabase/server';
import { getPlan } from '@/lib/subscription';
import PricingClient from './pricing-client';

export default async function PricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? '';
  const planData = await getPlan(userId);

  return <PricingClient planData={planData} />;
}
