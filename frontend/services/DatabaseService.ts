// services/DatabaseService.ts

import { supabase } from './SupabaseClient';

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  franchise_id: string;
  created_by: string;
}

export interface GeneratedBillItemRow {
  id?: number;
  bill_id?: number;
  menu_item_id: number;
  item_name?: string;
  qty: number;
  price: number;
  franchise_id: string;
}

export interface CategoryTotal {
  category: string;
  totalQty: number;
}

export interface ItemTotal {
  item_name: string;
  totalQty: number;
}

export interface FullBillRow {
  id: number;
  created_at: string;
  total: number;
  mode_payment: string | null;
  items: GeneratedBillItemRow[];
}

/**
 * Returned by getFranchiseId()
 */
export interface FranchiseInfo {
  user: any;
  /** The full ID, e.g. "FR-CENTRAL" */
  franchise_id: string;
  /** Path to navigate to after login */
  dashboardRoute: string;
}

export const databaseService = {
  /** 1. Get the currently logged‐in user */
  async getCurrentUserInfo() {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw error || new Error('User not found');
    return user;
  },

  /**
   * 2. Resolve the franchise_id for the current user,
   *    and compute the corresponding dashboard route.
   */
  async getFranchiseId(): Promise<FranchiseInfo> {
    const user = await this.getCurrentUserInfo();

    // a) Try profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('franchise_id')
      .eq('id', user.id)
      .single();

    let fullId: string;
    if (data?.franchise_id) {
      fullId = data.franchise_id;
    } else {
      // b) Fallback to parsing from email alias
      const email = user.email || '';
      if (email.startsWith('store.')) {
        const parsed = email.split('store.')[1].split('@')[0];
        fullId = parsed.toUpperCase();
      } else if (email.includes('+')) {
        const parsed = email.split('+')[1].split('@')[0];
        fullId = parsed.toUpperCase();
      } else {
        console.error('❌ Franchise ID lookup failed', { user, data, error });
        throw new Error('Franchise ID not found in profile or email');
      }
    }

    // strip the "FR-" prefix for routing logic
    const baseId = fullId.replace(/^FR-/, '').toUpperCase();

    // map to dashboard route
    const dashboardRoute =
      baseId === 'CENTRAL'
        ? '/(tabs)/central_dashboard'
        : '/(tabs)/admin-dashboard-billing';

    return { user, franchise_id: fullId, dashboardRoute };
  },

  /** 3. Fetch all menu items for this franchise */
  async getMenuItems(userFranchiseId?: string): Promise<MenuItem[]> {
    const { franchise_id } = await this.getFranchiseId();
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('franchise_id', franchise_id)
      .order('category', { ascending: true });
    if (error) throw error;
    return (data as MenuItem[]) || [];
  },

  /** 4. Insert a new menu item */
  async addMenuItem(
    item: Omit<MenuItem, 'id' | 'created_by'>,
    CENTRAL_ID?: string
  ): Promise<void> {
    const { user, franchise_id } = await this.getFranchiseId();
    const { error } = await supabase
      .from('menu_items')
      .insert([{ ...item, franchise_id, created_by: user.id }]);
    if (error) throw error;
  },

  /** 5. Update an existing menu item */
  async updateMenuItem(
    id: number,
    updates: Partial<Omit<MenuItem, 'id' | 'created_by'>>,
    userFranchiseId: string
  ): Promise<void> {
    const { franchise_id } = await this.getFranchiseId();
    const { error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .eq('franchise_id', franchise_id);
    if (error) throw error;
  },

  /** 6. Delete a menu item */
  async deleteMenuItem(id: number, userFranchiseId?: string): Promise<void> {
    const { franchise_id } = await this.getFranchiseId();
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('franchise_id', franchise_id);
    if (error) throw error;
  },

  /**
   * 7. Create a new bill and its items, now including payment mode.
   *    modePayment must be either 'Cash' or 'UPI'.
   */
  async createGeneratedBill(
    billTotal: number,
    items: Omit<GeneratedBillItemRow, 'id' | 'bill_id'>[],
    modePayment: 'Cash' | 'UPI'
  ): Promise<number> {
    const { user, franchise_id } = await this.getFranchiseId();

    // insert into bills_generated_billing including mode_payment
    const { data: billData, error: billError } = await supabase
      .from('bills_generated_billing')
      .insert({
        total: billTotal,
        created_by: user.id,
        franchise_id,
        mode_payment: modePayment,
      })
      .select('id')
      .single();

    if (billError || !billData)
      throw billError || new Error('Failed to create bill');

    const billId = billData.id;

    // insert the line items
    const { error: itemsError } = await supabase
      .from('bill_items_generated_billing')
      .insert(
        items.map(i => ({
          bill_id: billId,
          menu_item_id: i.menu_item_id,
          item_name: i.item_name,
          qty: i.qty,
          price: i.price,
          franchise_id,
        }))
      );

    if (itemsError) throw itemsError;

    return billId;
  },

  /** 8. Fetch bills in a date range (no change here) */
  async getGeneratedBills(
    startTs: string,
    endTs: string
  ): Promise<{ id: number; created_at: string; total: number }[]> {
    const { franchise_id } = await this.getFranchiseId();
    const { data, error } = await supabase
      .from('bills_generated_billing')
      .select('id, created_at, total')
      .eq('franchise_id', franchise_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]) || [];
  },

  /** 9. Fetch line‑items for a given bill */
  async getGeneratedBillItems(billId: number): Promise<GeneratedBillItemRow[]> {
    const { franchise_id } = await this.getFranchiseId();
    const { data, error } = await supabase
      .from('bill_items_generated_billing')
      .select('item_name, qty, price')
      .eq('franchise_id', franchise_id)
      .eq('bill_id', billId);
    if (error) throw error;
    return (data as GeneratedBillItemRow[]) || [];
  },

  /** 10. Sum total revenue over a date range */
  async getRevenueForDateRange(
    startTs: string,
    endTs: string,
    franchiseOverride?: string
  ): Promise<number> {
    const franchise_id = franchiseOverride
      ? franchiseOverride
      : (await this.getFranchiseId()).franchise_id;
    const { data, error } = await supabase
      .from('bills_generated_billing')
      .select('total')
      .eq('franchise_id', franchise_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (error) throw error;
    return (data || []).reduce((sum: number, r: any) => sum + (r.total || 0), 0);
  },

  /** 11. Count orders over a date range */
  async getOrderCountForDateRange(
    startTs: string,
    endTs: string,
    franchiseOverride?: string
  ): Promise<number> {
    const franchise_id = franchiseOverride
      ? franchiseOverride
      : (await this.getFranchiseId()).franchise_id;
    const { count, error } = await supabase
      .from('bills_generated_billing')
      .select('*', { count: 'exact', head: true })
      .eq('franchise_id', franchise_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (error) throw error;
    return count || 0;
  },

  /** 12. Get just the created_at timestamps (for hourly bins) */
  async getBillRowsForDateRange(
    startTs: string,
    endTs: string,
    franchiseOverride?: string
  ): Promise<{ created_at: string }[]> {
    const franchise_id = franchiseOverride
      ? franchiseOverride
      : (await this.getFranchiseId()).franchise_id;
    const { data, error } = await supabase
      .from('bills_generated_billing')
      .select('created_at')
      .eq('franchise_id', franchise_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (error) throw error;
    return data as { created_at: string }[];
  },

  /** 13. Aggregate item-level quantities over a date range */
  async getItemTotalsForDateRange(
    startTs: string,
    endTs: string,
    franchiseOverride?: string
  ): Promise<ItemTotal[]> {
    const franchise_id = franchiseOverride
      ? franchiseOverride
      : (await this.getFranchiseId()).franchise_id;
    const { data: bills, error: billError } = await supabase
      .from('bills_generated_billing')
      .select('id')
      .eq('franchise_id', franchise_id)
      .gte('created_at', startTs)
      .lte('created_at', endTs);
    if (billError) throw billError;
    const billIds = (bills || []).map((b: any) => b.id);
    if (!billIds.length) return [];

    const { data: items, error: itemsError } = await supabase
      .from('bill_items_generated_billing')
      .select('item_name, qty')
      .in('bill_id', billIds);
    if (itemsError) throw itemsError;

    const totals: Record<string, number> = {};
    items.forEach((i: any) => {
      totals[i.item_name] = (totals[i.item_name] || 0) + i.qty;
    });
    return Object.entries(totals).map(([item_name, totalQty]) => ({ item_name, totalQty }));
  },

  /** 14. For Excel export: get every bill + nested items in one query */
  async getAllBillingData(): Promise<FullBillRow[]> {
    const { franchise_id } = await this.getFranchiseId();
    const { data, error } = await supabase
      .from('bills_generated_billing')
      .select(`
        id,
        created_at,
        total,
        mode_payment,
        bill_items_generated_billing (
          id,
          menu_item_id,
          item_name,
          qty,
          price
        )
      `)
      .eq('franchise_id', franchise_id);
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      created_at: row.created_at,
      total: row.total,
      mode_payment: row.mode_payment,
      items: (row.bill_items_generated_billing || []).map((it: any) => ({
        id: it.id,
        bill_id: row.id,
        menu_item_id: it.menu_item_id,
        item_name: it.item_name,
        qty: it.qty,
        price: it.price,
        franchise_id,
      })),
    }));
  },

  // ────────────────────────────────────────────────────────────────
  // Franchise-specific utilities (unchanged)…
  // ────────────────────────────────────────────────────────────────

  async getRevenueForFranchise(franchiseId: string): Promise<number> {
    const { data, error } = await supabase
      .from('bills_generated_billing')
      .select('total')
      .eq('franchise_id', franchiseId)
      .throwOnError();
    return (data as any[]).reduce((sum, r) => sum + (r.total || 0), 0);
  },

  async getOrderCountForFranchise(franchiseId: string): Promise<number> {
    const { count, error } = await supabase
      .from('bills_generated_billing')
      .select('*', { count: 'exact', head: true })
      .eq('franchise_id', franchiseId)
      .throwOnError();
    return count || 0;
  },

  async getItemTotalsForFranchise(franchiseId: string): Promise<ItemTotal[]> {
    const { data: bills, error: be } = await supabase
      .from('bills_generated_billing')
      .select('id')
      .eq('franchise_id', franchiseId)
      .throwOnError();
    const billIds = (bills || []).map(b => b.id);
    if (!billIds.length) return [];

    const { data: items, error: ie } = await supabase
      .from('bill_items_generated_billing')
      .select('item_name, qty')
      .in('bill_id', billIds)
      .throwOnError();

    const totals: Record<string, number> = {};
    (items || []).forEach(i => {
      totals[i.item_name] = (totals[i.item_name] || 0) + i.qty;
    });
    return Object.entries(totals).map(([item_name, totalQty]) => ({ item_name, totalQty }));
  },
};
