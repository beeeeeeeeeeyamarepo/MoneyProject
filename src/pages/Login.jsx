import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Login({ onMfaVerified }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('password') // 'password' | 'totp'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [challengeId, setChallengeId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    // MFAが設定されているか確認
    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]

    if (!totpFactor || totpFactor.status !== 'verified') {
      // MFA未設定 → セットアップへ
      navigate('/setup-mfa')
    } else {
      // MFA設定済み → TOTPチャレンジへ
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      })
      if (challengeError) {
        setError('認証エラーが発生しました')
        setLoading(false)
        return
      }
      setChallengeId(challengeData.id)
      setStep('totp')
    }
    setLoading(false)
  }

  const handleTotpVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: factors } = await supabase.auth.mfa.listFactors()
    const totpFactor = factors?.totp?.[0]

    const { error } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId,
      code: totpCode,
    })

    if (error) {
      setError('認証コードが正しくありません')
      setLoading(false)
      return
    }

    onMfaVerified()
    navigate('/')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-gray-800">資産管理</h1>
        <p className="text-center text-gray-500 text-sm mb-8">
          {step === 'password' ? 'ログイン' : 'Microsoft Authenticatorのコードを入力'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {step === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? '確認中...' : '次へ'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">認証コード（6桁）</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition disabled:opacity-50"
            >
              {loading ? '確認中...' : 'ログイン'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('password'); setTotpCode('') }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              戻る
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
