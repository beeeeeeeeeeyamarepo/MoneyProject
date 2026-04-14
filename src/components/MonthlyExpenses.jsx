import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_INCOME_CATEGORIES = ['手持ち', 'UFJ(メイン)', 'UFJ(サブ)', 'JRE', '給与', 'その他']
const DEFAULT_EXPENSE_CATEGORIES = ['家賃', '楽天', 'エポス', 'Amazon', 'Viewカード', '奨学金', '都民共済', '貯蓄', 'その他']

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function MonthlyExpenses() {
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)
  const [incomeItems, setIncomeItems] = useState([])
  const [expenseItems, setExpenseItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newIncomeCategory, setNewIncomeCategory] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: inc }, { data: exp }] = await Promise.all([
      supabase.from('monthly_income_items').select('*')
        .eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('monthly_expense_items').select('*')
        .eq('user_id', user.id).eq('year', year).eq('month', month),
    ])

    // デフォルトカテゴリがなければ初期化
    const existingIncCats = (inc || []).map(i => i.category)
    const existingExpCats = (exp || []).map(e => e.category)

    const incData = DEFAULT_INCOME_CATEGORIES.map(cat => {
      const existing = (inc || []).find(i => i.category === cat)
      return existing || { category: cat, amount: '', isNew: true }
    })
    const additionalInc = (inc || []).filter(i => !DEFAULT_INCOME_CATEGORIES.includes(i.category))

    const expData = DEFAULT_EXPENSE_CATEGORIES.map(cat => {
      const existing = (exp || []).find(e => e.category === cat)
      return existing || { category: cat, amount: '', isNew: true }
    })
    const additionalExp = (exp || []).filter(e => !DEFAULT_EXPENSE_CATEGORIES.includes(e.category))

    setIncomeItems([...incData, ...additionalInc])
    setExpenseItems([...expData, ...additionalExp])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [year, month])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    // 既存データを削除して全件upsert
    await Promise.all([
      supabase.from('monthly_income_items').delete()
        .eq('user_id', user.id).eq('year', year).eq('month', month),
      supabase.from('monthly_expense_items').delete()
        .eq('user_id', user.id).eq('year', year).eq('month', month),
    ])

    const incRows = incomeItems
      .filter(i => i.amount !== '' && i.amount !== null)
      .map(i => ({ user_id: user.id, year, month, category: i.category, amount: Number(i.amount) }))
    const expRows = expenseItems
      .filter(e => e.amount !== '' && e.amount !== null)
      .map(e => ({ user_id: user.id, year, month, category: e.category, amount: Number(e.amount) }))

    await Promise.all([
      incRows.length > 0 && supabase.from('monthly_income_items').insert(incRows),
      expRows.length > 0 && supabase.from('monthly_expense_items').insert(expRows),
    ])

    await fetchData()
    setSaving(false)
  }

  const addIncomeCategory = () => {
    if (!newIncomeCategory.trim()) return
    setIncomeItems([...incomeItems, { category: newIncomeCategory.trim(), amount: '', isNew: true }])
    setNewIncomeCategory('')
  }

  const addExpenseCategory = () => {
    if (!newExpenseCategory.trim()) return
    setExpenseItems([...expenseItems, { category: newExpenseCategory.trim(), amount: '', isNew: true }])
    setNewExpenseCategory('')
  }

  const fmt = (n) => Number(n || 0).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })
  const totalIncome = incomeItems.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalExpense = expenseItems.reduce((s, e) => s + Number(e.amount || 0), 0)
  const balance = totalIncome - totalExpense

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      {/* 月選択 */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex gap-3 items-center">
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
        </select>
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <span className="text-sm text-gray-500">{year}年{month}月</span>
      </div>

      {/* 収支サマリー */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-blue-600">収入合計</p>
          <p className="font-bold text-blue-700 text-sm mt-1">{fmt(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-2xl p-3 text-center">
          <p className="text-xs text-red-600">支払い合計</p>
          <p className="font-bold text-red-600 text-sm mt-1">{fmt(totalExpense)}</p>
        </div>
        <div className={`${balance >= 0 ? 'bg-emerald-50' : 'bg-orange-50'} rounded-2xl p-3 text-center`}>
          <p className={`text-xs ${balance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>収支差</p>
          <p className={`font-bold text-sm mt-1 ${balance >= 0 ? 'text-emerald-700' : 'text-orange-600'}`}>{fmt(balance)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 収入 */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-blue-700 mb-3">💰 収入</h2>
          <div className="space-y-2">
            {incomeItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <label className="text-xs text-gray-600 w-28 shrink-0">{item.category}</label>
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => {
                    const updated = [...incomeItems]
                    updated[idx] = { ...item, amount: e.target.value }
                    setIncomeItems(updated)
                  }}
                  placeholder="0"
                  min="0"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newIncomeCategory}
              onChange={e => setNewIncomeCategory(e.target.value)}
              placeholder="項目を追加"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={e => e.key === 'Enter' && addIncomeCategory()}
            />
            <button onClick={addIncomeCategory} className="text-xs bg-blue-100 text-blue-700 px-2 py-1.5 rounded-lg hover:bg-blue-200">追加</button>
          </div>
        </div>

        {/* 支払い */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-red-600 mb-3">💳 支払い</h2>
          <div className="space-y-2">
            {expenseItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <label className="text-xs text-gray-600 w-28 shrink-0">{item.category}</label>
                <input
                  type="number"
                  value={item.amount}
                  onChange={e => {
                    const updated = [...expenseItems]
                    updated[idx] = { ...item, amount: e.target.value }
                    setExpenseItems(updated)
                  }}
                  placeholder="0"
                  min="0"
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={newExpenseCategory}
              onChange={e => setNewExpenseCategory(e.target.value)}
              placeholder="項目を追加"
              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-400"
              onKeyDown={e => e.key === 'Enter' && addExpenseCategory()}
            />
            <button onClick={addExpenseCategory} className="text-xs bg-red-100 text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-200">追加</button>
          </div>
        </div>
      </div>

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
