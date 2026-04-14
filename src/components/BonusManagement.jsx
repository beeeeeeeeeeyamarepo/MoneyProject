import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const SEASONS = ['夏季', '冬季', '決算']
const currentYear = new Date().getFullYear()

export default function BonusManagement() {
  const [bonuses, setBonuses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editBonus, setEditBonus] = useState(null)
  const [bonusForm, setBonusForm] = useState({ year: currentYear, season: '夏季', total_amount: '' })
  const [items, setItems] = useState([{ category: '', amount: '', memo: '' }])
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  const fetchBonuses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: bonusData } = await supabase.from('bonus_records').select('*')
      .eq('user_id', user.id).order('year', { ascending: false }).order('season')

    const withItems = await Promise.all((bonusData || []).map(async b => {
      const { data: itemData } = await supabase.from('bonus_items').select('*').eq('bonus_id', b.id)
      return { ...b, items: itemData || [] }
    }))

    setBonuses(withItems)
    setLoading(false)
  }

  useEffect(() => { fetchBonuses() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    let bonusId = editBonus?.id
    if (editBonus) {
      await supabase.from('bonus_records').update({
        year: Number(bonusForm.year),
        season: bonusForm.season,
        total_amount: Number(bonusForm.total_amount),
        updated_at: new Date().toISOString(),
      }).eq('id', editBonus.id)
      await supabase.from('bonus_items').delete().eq('bonus_id', editBonus.id)
    } else {
      const { data } = await supabase.from('bonus_records').insert({
        user_id: user.id,
        year: Number(bonusForm.year),
        season: bonusForm.season,
        total_amount: Number(bonusForm.total_amount),
      }).select().single()
      bonusId = data.id
    }

    const validItems = items.filter(i => i.category && i.amount)
    if (validItems.length > 0) {
      await supabase.from('bonus_items').insert(
        validItems.map(i => ({
          bonus_id: bonusId,
          category: i.category,
          amount: Number(i.amount),
          memo: i.memo || null,
        }))
      )
    }

    resetForm()
    await fetchBonuses()
    setSaving(false)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditBonus(null)
    setBonusForm({ year: currentYear, season: '夏季', total_amount: '' })
    setItems([{ category: '', amount: '', memo: '' }])
  }

  const handleEdit = (bonus) => {
    setEditBonus(bonus)
    setBonusForm({ year: bonus.year, season: bonus.season, total_amount: String(bonus.total_amount) })
    setItems(bonus.items.length > 0
      ? bonus.items.map(i => ({ category: i.category, amount: String(i.amount), memo: i.memo || '' }))
      : [{ category: '', amount: '', memo: '' }]
    )
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('bonus_records').delete().eq('id', id)
    await fetchBonuses()
  }

  const addItem = () => setItems([...items, { category: '', amount: '', memo: '' }])
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx, field, value) => {
    const updated = [...items]
    updated[idx] = { ...updated[idx], [field]: value }
    setItems(updated)
  }

  const fmt = (n) => Number(n).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      <button
        onClick={() => { setShowForm(!showForm); if (showForm) resetForm() }}
        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 rounded-xl transition text-sm"
      >
        {showForm ? '閉じる' : '+ 賞与を追加'}
      </button>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{editBonus ? '賞与を編集' : '賞与を追加'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">年</label>
                <input type="number" value={bonusForm.year}
                  onChange={e => setBonusForm({ ...bonusForm, year: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">時期</label>
                <select value={bonusForm.season}
                  onChange={e => setBonusForm({ ...bonusForm, season: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400">
                  {SEASONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">支給額（円）</label>
                <input type="number" value={bonusForm.total_amount} required
                  onChange={e => setBonusForm({ ...bonusForm, total_amount: e.target.value })}
                  placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-medium text-gray-600">使い道</p>
                <button type="button" onClick={addItem}
                  className="text-xs text-amber-600 hover:text-amber-800">＋ 追加</button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input type="text" value={item.category}
                      onChange={e => updateItem(idx, 'category', e.target.value)}
                      placeholder="項目名"
                      className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="number" value={item.amount}
                      onChange={e => updateItem(idx, 'amount', e.target.value)}
                      placeholder="金額"
                      className="w-24 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    <input type="text" value={item.memo}
                      onChange={e => updateItem(idx, 'memo', e.target.value)}
                      placeholder="メモ"
                      className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400" />
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)}
                        className="text-red-400 hover:text-red-600 text-xs">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {bonusForm.total_amount && (
                <div className="mt-2 text-xs text-gray-500 flex justify-between">
                  <span>使い道合計: {fmt(items.reduce((s, i) => s + Number(i.amount || 0), 0))}</span>
                  <span>残り: {fmt(Number(bonusForm.total_amount) - items.reduce((s, i) => s + Number(i.amount || 0), 0))}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '保存中...' : editBonus ? '更新' : '追加'}
              </button>
              <button type="button" onClick={resetForm}
                className="px-4 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
            </div>
          </form>
        </div>
      )}

      {/* 一覧 */}
      <div className="space-y-3">
        {bonuses.length === 0 && <p className="text-center text-gray-400 text-sm py-6">賞与記録がまだありません</p>}
        {bonuses.map(bonus => {
          const usedTotal = bonus.items.reduce((s, i) => s + Number(i.amount), 0)
          const remaining = Number(bonus.total_amount) - usedTotal
          const isExpanded = expandedId === bonus.id
          return (
            <div key={bonus.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div
                className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : bonus.id)}
              >
                <div>
                  <p className="font-medium text-gray-800">{bonus.year}年 {bonus.season}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{bonus.items.length}件の使い道</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-amber-600">{fmt(bonus.total_amount)}</p>
                  {remaining !== 0 && (
                    <p className={`text-xs ${remaining > 0 ? 'text-gray-400' : 'text-red-400'}`}>
                      残り {fmt(remaining)}
                    </p>
                  )}
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 pb-4">
                  <div className="space-y-1.5 mt-3">
                    {bonus.items.map(item => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.category}{item.memo ? ` (${item.memo})` : ''}</span>
                        <span className="font-medium">{fmt(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => handleEdit(bonus)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
                    <button onClick={() => handleDelete(bonus.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
