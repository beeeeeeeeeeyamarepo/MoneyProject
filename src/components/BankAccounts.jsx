import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const emptyForm = { name: '', balance: '' }

export default function BankAccounts() {
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editId, setEditId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchAccounts = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    setAccounts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (editId) {
      await supabase.from('bank_accounts').update({
        name: form.name,
        balance: Number(form.balance),
        updated_at: new Date().toISOString(),
      }).eq('id', editId)
    } else {
      await supabase.from('bank_accounts').insert({
        user_id: user.id,
        name: form.name,
        balance: Number(form.balance),
      })
    }

    setForm(emptyForm)
    setEditId(null)
    await fetchAccounts()
    setSaving(false)
  }

  const handleEdit = (account) => {
    setEditId(account.id)
    setForm({ name: account.name, balance: String(account.balance) })
  }

  const handleDelete = async (id) => {
    if (!confirm('削除しますか？')) return
    await supabase.from('bank_accounts').delete().eq('id', id)
    await fetchAccounts()
  }

  const fmt = (n) => Number(n).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })
  const total = accounts.reduce((sum, a) => sum + Number(a.balance), 0)

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-4">
      {/* 合計 */}
      <div className="bg-blue-50 rounded-2xl p-4 flex justify-between items-center">
        <span className="text-sm text-blue-700 font-medium">合計</span>
        <span className="text-xl font-bold text-blue-700">{fmt(total)}</span>
      </div>

      {/* フォーム */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          {editId ? '口座を編集' : '口座を追加'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="口座名（例：三菱UFJ 普通預金）"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            placeholder="残高（円）"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
            required
            min="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition disabled:opacity-50"
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
        {accounts.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">口座がまだありません</p>
        )}
        {accounts.map((account) => (
          <div key={account.id} className="bg-white rounded-2xl shadow-sm p-4 flex justify-between items-center">
            <div>
              <p className="font-medium text-gray-800 text-sm">{account.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                更新: {new Date(account.updated_at || account.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-gray-800">{fmt(account.balance)}</span>
              <button onClick={() => handleEdit(account)} className="text-xs text-blue-500 hover:text-blue-700">編集</button>
              <button onClick={() => handleDelete(account.id)} className="text-xs text-red-400 hover:text-red-600">削除</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
