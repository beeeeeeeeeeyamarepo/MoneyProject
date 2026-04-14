import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { exportToExcel } from '../lib/exportExcel'
import BankAccounts from '../components/BankAccounts'
import Investments from '../components/Investments'
import Income from '../components/Income'
import Summary from '../components/Summary'
import MonthlyExpenses from '../components/MonthlyExpenses'
import AssetTracking from '../components/AssetTracking'
import BonusManagement from '../components/BonusManagement'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('summary')
  const [user, setUser] = useState(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportToExcel()
    } finally {
      setExporting(false)
    }
  }

  const tabs = [
    { id: 'summary', label: '概要' },
    { id: 'monthly', label: '生活費' },
    { id: 'bank', label: '銀行・現金' },
    { id: 'investment', label: '投資' },
    { id: 'asset-tracking', label: '資産推移' },
    { id: 'bonus', label: '賞与' },
    { id: 'income', label: '収入管理' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">資産管理</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {exporting ? 'エクスポート中...' : 'Excelで出力'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* タブ */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-0 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* コンテンツ */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'summary' && <Summary />}
        {activeTab === 'monthly' && <MonthlyExpenses />}
        {activeTab === 'bank' && <BankAccounts />}
        {activeTab === 'investment' && <Investments />}
        {activeTab === 'asset-tracking' && <AssetTracking />}
        {activeTab === 'bonus' && <BonusManagement />}
        {activeTab === 'income' && <Income />}
      </main>
    </div>
  )
}
