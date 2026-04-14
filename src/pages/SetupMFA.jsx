import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function SetupMFA({ onComplete }) {
  const navigate = useNavigate()
  const [qrCode, setQrCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [enrollLoading, setEnrollLoading] = useState(true)

  useEffect(() => {
    const enroll = async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: '資産管理アプリ',
        friendlyName: 'Microsoft Authenticator',
      })
      if (error) {
        setError('MFAの設定に失敗しました')
      } else {
        setQrCode(data.totp.qr_code)
        setFactorId(data.id)
      }
      setEnrollLoading(false)
    }
    enroll()
  }, [])

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError) {
      setError('チャレンジの作成に失敗しました')
      setLoading(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challengeData.id,
      code,
    })

    if (verifyError) {
      setError('コードが正しくありません。もう一度確認してください。')
      setLoading(false)
      return
    }

    onComplete()
    navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-xl font-bold text-center mb-2 text-gray-800">二要素認証のセットアップ</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          Microsoft AuthenticatorでQRコードを読み取ってください
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {enrollLoading ? (
          <div className="text-center text-gray-400 py-8">QRコードを生成中...</div>
        ) : (
          <>
            {qrCode && (
              <div className="flex justify-center mb-6">
                <div
                  className="border border-gray-200 rounded-lg p-2"
                  dangerouslySetInnerHTML={{ __html: qrCode }}
                />
              </div>
            )}

            <div className="bg-blue-50 text-blue-700 text-xs rounded-lg p-3 mb-6">
              <p className="font-medium mb-1">手順：</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Microsoft Authenticatorを開く</li>
                <li>「+」→「その他のアカウント」を選択</li>
                <li>上のQRコードをスキャン</li>
                <li>表示された6桁のコードを下に入力</li>
              </ol>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">確認コード（6桁）</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
              >
                {loading ? '確認中...' : '設定を完了する'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
