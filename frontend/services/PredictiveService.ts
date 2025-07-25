// frontend/services/PredictiveService.ts
import { supabase } from './SupabaseClient'

export interface Recommendation {
  item: string
  recommendation: string
}

type RawItem = {
  bill_id: number
  item_name: string
  qty: number
}

export const predictiveService = {
  async getRecommendations(
    startIso: string,
    endIso: string,
    lookbackDays = 5
  ): Promise<Recommendation[]> {
    // 1) grab all bills in the range
    const { data: bills, error: billErr } = await supabase
      .from('bills_generated_billing')
      .select('id, created_at')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
    if (billErr) throw billErr
    if (!bills?.length) return []

    // map each bill to its calendar date
    const dateByBill = new Map<number,string>(
      bills.map(b => {
        const d = new Date(b.created_at)
        d.setHours(0,0,0,0)
        return [b.id, d.toISOString().slice(0,10)]
      })
    )

    // 2) fetch only the item_name + qty for those bills
    const billIds = bills.map(b => b.id)
    const { data: items, error: itemErr } = await supabase
      .from('bill_items_generated_billing')
      .select('bill_id, item_name, qty')
      .in('bill_id', billIds)
    if (itemErr) throw itemErr

    // 3) aggregate per-item per-day
    const qtyByItemDay = new Map<string, Record<string, number>>()
    ;(items as RawItem[]).forEach(it => {
      const day = dateByBill.get(it.bill_id)
      if (!day) return
      const rec = qtyByItemDay.get(it.item_name) || {}
      rec[day] = (rec[day] || 0) + it.qty
      qtyByItemDay.set(it.item_name, rec)
    })

    // 4) for each item compute the slope of a simple linear regression on the last N days
    const recs: Recommendation[] = []
    qtyByItemDay.forEach((dayMap, item) => {
      const days = Object.keys(dayMap).sort()
      const tail = days.slice(-lookbackDays)
      if (tail.length < 2) return

      // x = 0,1,...,(n-1); y = quantities
      const n = tail.length
      const xs = tail.map((_,i) => i)
      const ys = tail.map(d => dayMap[d]!)

      const xBar = xs.reduce((a,b)=>a+b, 0)/n
      const yBar = ys.reduce((a,b)=>a+b, 0)/n

      let cov=0, varx=0
      for (let i=0; i<n; i++) {
        const dx = xs[i]-xBar, dy = ys[i]-yBar
        cov += dx*dy
        varx += dx*dx
      }
      const slope = varx ? cov/varx : 0

      recs.push({
        item,
        recommendation:
          slope > 0
            ? '🥳 Trending up—consider stocking more.'
            : '⚠️ Flat or declining—reallocate resources.',
      })
    })

    return recs
  }
}
