import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const emptyForm = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  age: '',
  stock_monthly: '',
  stock_bonus: '',
  stock_pension: '',
  stock_plan: '',
  stock_actual: '',
  cash_monthly: '',
  cash_bonus: '',
  cash_plan: '',
  cash_actual: '',
}

export default function AssetTracking() {
  const [records, setRecords] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const fetchRecords = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('asset_tracking').select('*')
      .eq('user_id', user.id)
      .order('year').order('month')
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
      age: form.age !== '' ? Number(form.age) : null,
      stock_monthly: Number(form.stock_monthly) || 0,
      stock_bonus: Number(form.stock_bonus) || 0,
      stock_pension: Number(form.stock_pension) || 0,
      stock_plan: Number(form.stock_plan) || 0,
      stock_actual: form.stock_actual !== '' ? Number(form.stock_actual) : null,
      cash_monthly: Number(form.cash_monthly) || 0,
      cash_bonus: Number(form.cash_bonus) || 0,
      cash_plan: Number(form.cash_plan) || 0,
      cash_actual: form.cash_actual !== '' ? Number(form.cash_actual) : null,
      updated_at: new Date().toISOString(),
    }

    if (editId) {
      await supabase.from('asset_tracking').update(payload).eq('id', editId)
    } else {
      await supabase.from('asset_tracking').insert({ ...payload, user_id: user.id })
    }

    setForm(emptyForm)
    setEditId(null)
    setShowForm(false)
    await fetchRecords()
    setSaving(false)
  }

  const handleEdit = (r) => {
    setEditId(r.id)
    setForm({
      year: r.year, month: r.month, age: r.age ?? '',
      stock_monthly: r.stock_monthly ?? '',
      stock_bonus: r.stock_bonus ?? '',
      stock_pension: r.stock_pension ?? '',
      stock_plan: r.stock_plan ?? '',
      stock_actual: r.stock_actual ?? '',
      cash_monthly: r.cash_monthly ?? '',
      cash_bonus: r.cash_bonus ?? '',
      cash_plan: r.cash_plan ?? '',
      cash_actual: r.cash_actual ?? '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('asset_tracking').delete().eq('id', id)
    await fetchRecords()
  }

  const fmt = (n) => n != null ? (Number(n) / 10000).toFixed(0) + '万' : '-'
  const fmtFull = (n) => n != null ? Number(n).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' }) : '-'

  // グラフ用データ
  const chartData = records.map(r => ({
    name: `${r.year}/${r.month}`,
    '株（計画）': r.stock_plan,
    '株（実績）': r.stock_actual,
    '現金（計画）': r.cash_plan,
    '現金（実績）': r.cash_actual,
  }))

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      {/* グラフ */}
      {records.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">資産推移グラフ</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => (v / 10000).toFixed(0) + '万'} tick={{ fontSize: 10 }} />
              <Tooltip formatter={v => fmtFull(v)} />
              <Legend />
              <Line type="monotone" dataKey="株（計画）" stroke="#93c5fd" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="株（実績）" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="現金（計画）" stroke="#6ee7b7" strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="現金（実績）" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 追加ボタン */}
      <button
        onClick={() => { setShowForm(!showForm); setEditId(null); setForm(emptyForm) }}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-xl transition text-sm"
      >
        {showForm ? '閉じる' : '+ 月次データを追加'}
      </button>

      {/* フォーム */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">{editId ? '編集' : '新規追加'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">年</label>
                <input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">月</label>
                <select value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">年齢</label>
                <input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} placeholder="任意"
                  className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-blue-600">📈 株</p>
                {[['stock_monthly','毎月積立'], ['stock_bonus','賞与分'], ['stock_pension','企業年金'], ['stock_plan','合計（計画）'], ['stock_actual','実績']].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                    <input type="number" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-emerald-600">💴 現金</p>
                {[['cash_monthly','毎月貯金'], ['cash_bonus','賞与分'], ['cash_plan','合計（計画）'], ['cash_actual','実績']].map(([key, label]) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-0.5">{label}</label>
                    <input type="number" value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} placeholder="0"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50">
                {saving ? '保存中...' : editId ? '更新' : '追加'}
              </button>
              {editId && (
                <button type="button" onClick={() => { setEditId(null); setForm(emptyForm); setShowForm(false) }}
                  className="px-4 text-sm text-gray-500 hover:text-gray-700">キャンセル</button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* 一覧 */}
      <div className="space-y-2">
        {records.length === 0 && <p className="text-center text-gray-400 text-sm py-6">データがまだありません</p>}
        {records.map(r => (
          <div key={r.id} className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">{r.year}年{r.month}月{r.age ? ` (${r.age}歳)` : ''}</p>
                <div className="grid grid-cols-2 gap-x-6 mt-1 text-xs text-gray-500">
                  <p>株（計画）: {fmt(r.stock_plan)}</p>
                  <p>現金（計画）: {fmt(r.cash_plan)}</p>
                  <p>株（実績）: {fmt(r.stock_actual)}</p>
                  <p>現金（実績）: {fmt(r.cash_actual)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-700">
                  総計: {fmt((r.stock_actual ?? r.stock_plan ?? 0) + (r.cash_actual ?? r.cash_plan ?? 0))}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-2">
              <button onClick={() => handleEdit(r)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
              <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
