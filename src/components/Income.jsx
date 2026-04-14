import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const emptyForm = {
  year: currentYear,
  month: currentMonth,
  salary: '',
  bonus: '',
  other: '',
  savings_goal: '',
  memo: '',
}

export default function Income() {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('income_records')
      .select('*')
      .eq('user_id', user.id)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      year: Number(form.year),
      month: Number(form.month),
      salary: Number(form.salary) || 0,
      bonus: Number(form.bonus) || 0,
      other: Number(form.other) || 0,
      savings_goal: Number(form.savings_goal) || 0,
      memo: form.memo,
      updated_at: new Date().toISOString(),
    }

    if (editId) {
      await supabase.from('income_records').update(payload).eq('id', editId)
    } else {
      await supabase.from('income_records').insert({ ...payload, user_id: user.id })
    }

    setForm(emptyForm)
    setEditId(null)
    await fetchRecords()
    setSaving(false)
  }

  const handleEdit = (r) => {
    setEditId(r.id)
    setForm({
      year: r.year,
      month: r.month,
      salary: String(r.salary),
      bonus: String(r.bonus),
      other: String(r.other),
      savings_goal: String(r.savings_goal),
      memo: r.memo || '',
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('income_records').delete().eq('id', id)
    await fetchRecords()
  }

  const fmt = (n) => Number(n).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      {/* フォーム */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {editId ? '収入を編集' : '収入を記録'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">年</label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">月</label>
              <select
                value={form.month}
                onChange={(e) => setForm({ ...form, month: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
          </div>
          <input
            type="number"
            placeholder="給与（円）"
            value={form.salary}
            onChange={(e) => setForm({ ...form, salary: e.target.value })}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="number"
            placeholder="賞与（円）"
            value={form.bonus}
            onChange={(e) => setForm({ ...form, bonus: e.target.value })}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="number"
            placeholder="その他収入（円）"
            value={form.other}
            onChange={(e) => setForm({ ...form, other: e.target.value })}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="number"
            placeholder="貯蓄目標（円）"
            value={form.savings_goal}
            onChange={(e) => setForm({ ...form, savings_goal: e.target.value })}
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="text"
            placeholder="メモ（賞与の使い道など）"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? '保存中...' : editId ? '更新' : '追加'}
            </button>
            {editId && (
              <button
                type="button"
                onClick={() => { setEditId(null); setForm(emptyForm) }}
                className="px-4 text-sm text-gray-500 hover:text-gray-700"
              >
                キャンセル
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 一覧 */}
      <div className="space-y-2">
        {records.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">収入記録がまだありません</p>
        )}
        {records.map((r) => {
          const total = Number(r.salary) + Number(r.bonus) + Number(r.other)
          return (
            <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800">{r.year}年{r.month}月</p>
                  <div className="text-xs text-gray-400 space-y-0.5 mt-1">
                    {r.salary > 0 && <p>給与: {fmt(r.salary)}</p>}
                    {r.bonus > 0 && <p>賞与: {fmt(r.bonus)}</p>}
                    {r.other > 0 && <p>その他: {fmt(r.other)}</p>}
                    {r.savings_goal > 0 && <p className="text-amber-600">貯蓄目標: {fmt(r.savings_goal)}</p>}
                    {r.memo && <p className="text-gray-500 mt-1">📝 {r.memo}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{fmt(total)}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => handleEdit(r)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
