import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']

export default function Summary() {
  const [banks, setBanks] = useState([])
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: bankData }, { data: invData }] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('user_id', user.id),
        supabase.from('investments').select('*').eq('user_id', user.id),
      ])
      setBanks(bankData || [])
      setInvestments(invData || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const totalBank = banks.reduce((sum, b) => sum + Number(b.balance), 0)
  const totalInvestment = investments.reduce((sum, i) => sum + Number(i.current_value), 0)
  const totalAssets = totalBank + totalInvestment

  const pieData = [
    { name: '銀行・現金', value: totalBank },
    { name: '投資', value: totalInvestment },
  ].filter(d => d.value > 0)

  const fmt = (n) => n.toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' })

  if (loading) return <div className="text-center text-gray-400 py-12">読み込み中...</div>

  return (
    <div className="space-y-6">
      {/* 合計資産 */}
      <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
        <p className="text-sm text-gray-500 mb-1">総資産</p>
        <p className="text-4xl font-bold text-gray-800">{fmt(totalAssets)}</p>
      </div>

      {/* 内訳カード */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">銀行・現金</p>
          <p className="text-xl font-bold text-blue-600">{fmt(totalBank)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-xs text-gray-500 mb-1">投資</p>
          <p className="text-xl font-bold text-emerald-600">{fmt(totalInvestment)}</p>
        </div>
      </div>

      {/* 円グラフ */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-sm font-medium text-gray-700 mb-4">資産配分</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
