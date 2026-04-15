import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BALANCE_CATS = ['手持ち', 'UFJ(メイン)', 'UFJ(サブ)', 'JRE']
const SALARY_CAT = '給与'
const FIXED_EXP_CATS = [
  '家賃', '楽天', 'エポス', 'Amazon',
  'Viewカード（翌月4日）', '奨学金', '都民共済', '貯蓄',
]

const CY = new Date().getFullYear()
const CM = new Date().getMonth() + 1
const nextOf = (y, m) => m === 12 ? { year: y + 1, month: 1 } : { year: y, month: m + 1 }
const fmt = n => Number(n || 0).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })

export default function MonthlyExpenses() {
  const [year, setYear]   = useState(CY)
  const [month, setMonth] = useState(CM)
  const nxt = nextOf(year, month)

  const [balances, setBalances] = useState(
    BALANCE_CATS.map(c => ({ category: c, amount: '' }))
  )
  const [salaryNow,  setSalaryNow]  = useState('')
  const [salaryNext, setSalaryNext] = useState('')
  const [planned, setPlanned] = useState([])
  const [fixedExp, setFixedExp] = useState(
    FIXED_EXP_CATS.map(c => ({ category: c, now: '', next: '' }))
  )
  const [extraExp, setExtraExp] = useState([])
  const [savings, setSavings] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [newPlanCat, setNewPlanCat] = useState('')
  const [newPlanAmt, setNewPlanAmt] = useState('')
  const [newExpCat,  setNewExpCat]  = useState('')

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const n = nextOf(year, month)
    const [
      { data: iN }, { data: iX },
      { data: eN }, { data: eX },
      { data: asset },
    ] = await Promise.all([
      supabase.from('monthly_income_items').select('*')
        .eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('monthly_income_items').select('*')
        .eq('user_id', user.id).eq('year', n.year).eq('month', n.month),
      supabase.from('monthly_expense_items').select('*')
        .eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('monthly_expense_items').select('*')
        .eq('user_id', user.id).eq('year', n.year).eq('month', n.month),
      supabase.from('asset_tracking').select('cash_plan,cash_actual')
        .eq('user_id', user.id).eq('year', year).eq('month', month).maybeSingle(),
    ])

    setBalances(BALANCE_CATS.map(c => {
      const e = (iN || []).find(i => i.category === c)
      return { category: c, amount: e ? String(e.amount) : '' }
    }))
    setSalaryNow( (iN || []).find(i => i.category === SALARY_CAT)?.amount?.toString() ?? '')
    setSalaryNext((iX || []).find(i => i.category === SALARY_CAT)?.amount?.toString() ?? '')

    const knownCats = new Set([...BALANCE_CATS, SALARY_CAT])
    setPlanned(
      (iX || [])
        .filter(i => !knownCats.has(i.category))
        .map(i => ({ category: i.category, amount: String(i.amount) }))
    )

    setFixedExp(FIXED_EXP_CATS.map(c => ({
      category: c,
      now:  (eN || []).find(e => e.category === c)?.amount?.toString() ?? '',
      next: (eX || []).find(e => e.category === c)?.amount?.toString() ?? '',
    })))

    const fixedSet = new Set(FIXED_EXP_CATS)
    const extraCats = [...new Set([
      ...(eN || []).filter(e => !fixedSet.has(e.category)).map(e => e.category),
      ...(eX || []).filter(e => !fixedSet.has(e.category)).map(e => e.category),
    ])]
    setExtraExp(extraCats.map(c => ({
      category: c,
      now:  (eN || []).find(e => e.category === c)?.amount?.toString() ?? '',
      next: (eX || []).find(e => e.category === c)?.amount?.toString() ?? '',
    })))

    setSavings(Number(asset?.cash_actual ?? asset?.cash_plan ?? 0))
    setLoading(false)
  }

  useEffect(() => { load() }, [year, month])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const n = nextOf(year, month)
    const uid = user.id

    await Promise.all([
      supabase.from('monthly_income_items').delete()
        .eq('user_id', uid).eq('year', year).eq('month', month),
      supabase.from('monthly_income_items').delete()
        .eq('user_id', uid).eq('year', n.year).eq('month', n.month),
      supabase.from('monthly_expense_items').delete()
        .eq('user_id', uid).eq('year', year).eq('month', month),
      supabase.from('monthly_expense_items').delete()
        .eq('user_id', uid).eq('year', n.year).eq('month', n.month),
    ])

    const iNowRows = [
      ...balances.filter(b => b.amount !== '').map(b => ({
        user_id: uid, year, month, category: b.category, amount: Number(b.amount)
      })),
      ...(salaryNow !== '' ? [{
        user_id: uid, year, month, category: SALARY_CAT, amount: Number(salaryNow)
      }] : []),
    ]
    const iNextRows = [
      ...(salaryNext !== '' ? [{
        user_id: uid, year: n.year, month: n.month, category: SALARY_CAT, amount: Number(salaryNext)
      }] : []),
      ...planned.filter(p => p.amount !== '').map(p => ({
        user_id: uid, year: n.year, month: n.month, category: p.category, amount: Number(p.amount)
      })),
    ]

    const allExpItems = [...fixedExp, ...extraExp]
    const eNowRows  = allExpItems.filter(e => e.now  !== '').map(e => ({
      user_id: uid, year, month, category: e.category, amount: Number(e.now)
    }))
    const eNextRows = allExpItems.filter(e => e.next !== '').map(e => ({
      user_id: uid, year: n.year, month: n.month, category: e.category, amount: Number(e.next)
    }))

    await Promise.all([
      iNowRows.length  && supabase.from('monthly_income_items').insert(iNowRows),
      iNextRows.length && supabase.from('monthly_income_items').insert(iNextRows),
      eNowRows.length  && supabase.from('monthly_expense_items').insert(eNowRows),
      eNextRows.length && supabase.from('monthly_expense_items').insert(eNextRows),
    ])

    await load()
    setSaving(false)
  }

  // Excel数式を再現
  const jre      = Number(balances.find(b => b.category === 'JRE')?.amount        || 0)
  const teMotchi = Number(balances.find(b => b.category === '手持ち')?.amount     || 0)
  const ufjMain  = Number(balances.find(b => b.category === 'UFJ(メイン)')?.amount || 0)
  const balTotal    = balances.reduce((s, b) => s + Number(b.amount || 0), 0) // B8
  const salary      = Number(salaryNow || 0)                                  // B7
  const allExpItems = [...fixedExp, ...extraExp]
  const expNow  = allExpItems.reduce((s, e) => s + Number(e.now  || 0), 0)   // G12
  const expNext = allExpItems.reduce((s, e) => s + Number(e.next || 0), 0)   // H12
  const afterDeduction = jre + salary - expNow - savings                     // H13
  const spendable      = teMotchi + ufjMain + afterDeduction                  // H14

  const updateExp = (isFixed, idx, field, val) => {
    if (isFixed) {
      const u = [...fixedExp]; u[idx] = { ...u[idx], [field]: val }; setFixedExp(u)
    } else {
      const u = [...extraExp]; u[idx] = { ...u[idx], [field]: val }; setExtraExp(u)
    }
  }

  const addPlanned = () => {
    if (!newPlanCat.trim()) return
    setPlanned([...planned, { category: newPlanCat.trim(), amount: newPlanAmt }])
    setNewPlanCat(''); setNewPlanAmt('')
  }
  const addExpItem = () => {
    if (!newExpCat.trim()) return
    setExtraExp([...extraExp, { category: newExpCat.trim(), now: '', next: '' }])
    setNewExpCat('')
  }

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">

      {/* 月選択 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 items-center flex-wrap">
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {[2023,2024,2025,2026,2027].map(y => <option key={y}>{y}</option>)}
        </select>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {Array.from({length:12},(_,i)=>i+1).map(m =>
            <option key={m} value={m}>{m}月</option>
          )}
        </select>
        <span className="text-xs text-gray-400">
          {year}年{month}月 ／ {nxt.year}年{nxt.month}月
        </span>
      </div>

      {/* 収入 */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-blue-700 mb-4">💰 収入</h2>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <span className="text-xs text-gray-400">項目</span>
          <span className="text-xs text-gray-400 text-right">{month}月</span>
          <span className="text-xs text-gray-400 text-right">{nxt.month}月</span>
        </div>
        <div className="space-y-2">
          {balances.map((item, i) => (
            <div key={item.category} className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600">{item.category}</label>
              <input
                type="number" value={item.amount} placeholder="0" min="0"
                onChange={e => {
                  const u = [...balances]; u[i] = { ...u[i], amount: e.target.value }; setBalances(u)
                }}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <span className="text-xs text-gray-300 text-right">—</span>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 items-center border-t pt-2">
            <span className="text-xs font-medium text-gray-500">口座残高計</span>
            <span className="text-xs font-semibold text-blue-700 text-right">{fmt(balTotal)}</span>
            <span></span>
          </div>
          <div className="grid grid-cols-3 gap-2 items-center border-t pt-2">
            <label className="text-xs text-gray-600 font-medium">給与</label>
            <input
              type="number" value={salaryNow} placeholder="0" min="0"
              onChange={e => setSalaryNow(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="number" value={salaryNext} placeholder="0" min="0"
              onChange={e => setSalaryNext(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {/* その他予定（来月の臨時収入） */}
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-medium text-gray-500 mb-2">📋 その他予定（来月の収入）</p>
          <div className="space-y-2">
            {planned.map((item, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-center">
                <div className="flex items-center gap-1">
                  <label className="text-xs text-gray-600 flex-1">{item.category}</label>
                  <button
                    onClick={() => setPlanned(planned.filter((_, j) => j !== i))}
                    className="text-gray-300 hover:text-red-400 text-xs"
                  >✕</button>
                </div>
                <span className="text-xs text-gray-300 text-right">—</span>
                <input
                  type="number" value={item.amount} placeholder="0" min="0"
                  onChange={e => {
                    const u = [...planned]; u[i] = { ...u[i], amount: e.target.value }; setPlanned(u)
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <input
              type="text" value={newPlanCat} placeholder="項目名（例：奨学金）"
              onChange={e => setNewPlanCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlanned()}
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <input
              type="number" value={newPlanAmt} placeholder="金額"
              onChange={e => setNewPlanAmt(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPlanned()}
              className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button onClick={addPlanned}
              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-200">
              追加
            </button>
          </div>
        </div>
      </div>

      {/* 支払い */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-red-600 mb-4">💳 支払い</h2>
        <div className="grid grid-cols-3 gap-2 mb-2">
          <span className="text-xs text-gray-400">項目</span>
          <span className="text-xs text-gray-400 text-right">{month}月</span>
          <span className="text-xs text-gray-400 text-right">{nxt.month}月</span>
        </div>
        <div className="space-y-2">
          {fixedExp.map((item, i) => (
            <div key={item.category} className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600">{item.category}</label>
              <input
                type="number" value={item.now} placeholder="0" min="0"
                onChange={e => updateExp(true, i, 'now', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <input
                type="number" value={item.next} placeholder="0" min="0"
                onChange={e => updateExp(true, i, 'next', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          ))}
          {extraExp.map((item, i) => (
            <div key={item.category} className="grid grid-cols-3 gap-2 items-center">
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-600 flex-1">{item.category}</label>
                <button
                  onClick={() => setExtraExp(extraExp.filter((_, j) => j !== i))}
                  className="text-gray-300 hover:text-red-400 text-xs"
                >✕</button>
              </div>
              <input
                type="number" value={item.now} placeholder="0" min="0"
                onChange={e => updateExp(false, i, 'now', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <input
                type="number" value={item.next} placeholder="0" min="0"
                onChange={e => updateExp(false, i, 'next', e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-2 items-center border-t pt-2">
            <span className="text-xs font-medium text-gray-500">支払合計</span>
            <span className="text-xs font-semibold text-red-600 text-right">{fmt(expNow)}</span>
            <span className="text-xs font-semibold text-red-600 text-right">{fmt(expNext)}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text" value={newExpCat} placeholder="支出項目を追加"
            onChange={e => setNewExpCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addExpItem()}
            className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <button onClick={addExpItem}
            className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-200">
            追加
          </button>
        </div>
      </div>

      {/* 収支サマリー */}
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📊 収支サマリー</h2>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">貯蓄累計（資産推移タブより・C14相当）</span>
          <span className="font-medium text-gray-500">{fmt(savings)}</span>
        </div>
        <div className="border-t pt-3 space-y-3">
          {/* H13 = B6 + B7 - G12 - C14 */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-gray-700">引き落とし後</p>
              <p className="text-xs text-gray-400">JRE ＋ 給与 − 今月支払 − 貯蓄累計</p>
            </div>
            <span className={"text-base font-bold " + (afterDeduction >= 0 ? 'text-emerald-600' : 'text-red-500')}>
              {fmt(afterDeduction)}
            </span>
          </div>
          {/* H14 = B3 + B4 + H13 */}
          <div className="flex justify-between items-start bg-blue-50 rounded-xl p-3">
            <div>
              <p className="text-sm font-semibold text-blue-700">翌月給与迄に使えるお金</p>
              <p className="text-xs text-blue-400">手持ち ＋ UFJ(メイン) ＋ 引き落とし後</p>
            </div>
            <span className={"text-lg font-bold " + (spendable >= 0 ? 'text-blue-700' : 'text-red-500')}>
              {fmt(spendable)}
            </span>
          </div>
        </div>
      </div>

      {/* 保存ボタン */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl transition disabled:opacity-50"
      >
        {saving ? '保存中...' : '保存する'}
      </button>

    </div>
  )
}
