import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { name: '', type: '株式', purchase_value: '', current_value: '', memo: '' }
const TYPES = ['株式', '投資信託', 'ETF', '債券', 'その他']

export default function Investments() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchItems() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const payload = {
      name: form.name,
      type: form.type,
      purchase_value: Number(form.purchase_value),
      current_value: Number(form.current_value),
      memo: form.memo,
      updated_at: new Date().toISOString(),
    }

    if (editId) {
      await supabase.from('investments').update(payload).eq('id', editId)
    } else {
      await supabase.from('investments').insert({ ...payload, user_id: user.id })
    }

    setForm(emptyForm)
    setEditId(null)
    await fetchItems()
    setSaving(false)
  }

  const handleEdit = (item) => {
    setEditId(item.id)
    setForm({
      name: item.name,
      type: item.type,
      purchase_value: String(item.purchase_value),
      current_value: String(item.current_value),
      memo: item.memo || '',
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('investments').delete().eq('id', id)
    await fetchItems()
  }

  const fmt = (n) => Number(n).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })
  const totalCurrent = items.reduce((sum, i) => sum + Number(i.current_value), 0)
  const totalPurchase = items.reduce((sum, i) => sum + Number(i.purchase_value), 0)
  const gain = totalCurrent - totalPurchase
  const gainPct = totalPurchase > 0 ? ((gain / totalPurchase) * 100).toFixed(1) : 0

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      {/* サマリー */}
      <div className="bg-emerald-50 rounded-2xl p-4 space-y-1">
        <div className="flex justify-between">
          <span className="text-sm text-emerald-700">評価額合計</span>
          <span className="font-bold text-emerald-700">{fmt(totalCurrent)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">取得額合計</span>
          <span className="text-sm text-gray-600">{fmt(totalPurchase)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">損益</span>
          <span className={`text-sm font-medium ${gain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {gain >= 0 ? '+' : ''}{fmt(gain)}（{gainPct}%）
          </span>
        </div>
      </div>

      {/* フォーム */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {editId ? '投資を編集' : '投資を追加'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="名称（例：eMAXIS Slim 全世界株式）"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="取得額（円）"
              value={form.purchase_value}
              onChange={(e) => setForm({ ...form, purchase_value: e.target.value })}
              required
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <input
              type="number"
              placeholder="現在評価額（円）"
              value={form.current_value}
              onChange={(e) => setForm({ ...form, current_value: e.target.value })}
              required
              min="0"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <input
            type="text"
            placeholder="メモ（任意）"
            value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
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
        {items.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">投資記録がまだありません</p>
        )}
        {items.map((item) => {
          const g = Number(item.current_value) - Number(item.purchase_value)
          const p = item.purchase_value > 0 ? ((g / item.purchase_value) * 100).toFixed(1) : 0
          return (
            <div key={item.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{item.name}</p>
                  <span className="text-xs bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{item.type}</span>
                  {item.memo && <p className="text-xs text-gray-400 mt-1">{item.memo}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800 text-sm">{fmt(item.current_value)}</p>
                  <p className={`text-xs ${g >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {g >= 0 ? '+' : ''}{fmt(g)}（{p}%）
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button onClick={() => handleEdit(item)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
