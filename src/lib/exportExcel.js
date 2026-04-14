import * as XLSX from 'xlsx'
import { supabase } from './supabase'

export async function exportToExcel() {
  const { data: { user } } = await supabase.auth.getUser()

  // 全データ取得
  const [{ data: banks }, { data: investments }, { data: income }] = await Promise.all([
    supabase.from('bank_accounts').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('investments').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('income_records').select('*').eq('user_id', user.id).order('year').order('month'),
  ])

  const wb = XLSX.utils.book_new()

  // ── シート1: 銀行・現金 ──
  const bankRows = (banks || []).map(b => ({
    '口座名': b.name,
    '残高（円）': Number(b.balance),
    '更新日': new Date(b.updated_at || b.created_at).toLocaleDateString('ja-JP'),
  }))
  bankRows.push({ '口座名': '合計', '残高（円）': bankRows.reduce((s, r) => s + r['残高（円）'], 0) })
  const wsBank = XLSX.utils.json_to_sheet(bankRows)
  wsBank['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsBank, '銀行・現金')

  // ── シート2: 投資 ──
  const invRows = (investments || []).map(i => ({
    '名称': i.name,
    '種別': i.type,
    '取得額（円）': Number(i.purchase_value),
    '評価額（円）': Number(i.current_value),
    '損益（円）': Number(i.current_value) - Number(i.purchase_value),
    '損益率（%）': i.purchase_value > 0
      ? ((( Number(i.current_value) - Number(i.purchase_value)) / Number(i.purchase_value)) * 100).toFixed(1)
      : '0.0',
    'メモ': i.memo || '',
  }))
  const totalPurchase = invRows.reduce((s, r) => s + r['取得額（円）'], 0)
  const totalCurrent = invRows.reduce((s, r) => s + r['評価額（円）'], 0)
  invRows.push({
    '名称': '合計',
    '種別': '',
    '取得額（円）': totalPurchase,
    '評価額（円）': totalCurrent,
    '損益（円）': totalCurrent - totalPurchase,
    '損益率（%）': totalPurchase > 0 ? (((totalCurrent - totalPurchase) / totalPurchase) * 100).toFixed(1) : '0.0',
    'メモ': '',
  })
  const wsInv = XLSX.utils.json_to_sheet(invRows)
  wsInv['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsInv, '投資')

  // ── シート3: 収入管理 ──
  const incomeRows = (income || []).map(r => ({
    '年': r.year,
    '月': r.month,
    '給与（円）': Number(r.salary),
    '賞与（円）': Number(r.bonus),
    'その他（円）': Number(r.other),
    '合計収入（円）': Number(r.salary) + Number(r.bonus) + Number(r.other),
    '貯蓄目標（円）': Number(r.savings_goal),
    'メモ': r.memo || '',
  }))
  const wsIncome = XLSX.utils.json_to_sheet(incomeRows)
  wsIncome['!cols'] = [{ wch: 6 }, { wch: 4 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsIncome, '収入管理')

  // ── シート4: サマリー ──
  const totalBank = (banks || []).reduce((s, b) => s + Number(b.balance), 0)
  const summaryRows = [
    { '項目': '銀行・現金合計', '金額（円）': totalBank },
    { '項目': '投資評価額合計', '金額（円）': totalCurrent },
    { '項目': '総資産', '金額（円）': totalBank + totalCurrent },
    { '項目': '投資損益', '金額（円）': totalCurrent - totalPurchase },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 20 }, { wch: 16 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'サマリー')

  // ダウンロード
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `資産管理_${date}.xlsx`)
}
