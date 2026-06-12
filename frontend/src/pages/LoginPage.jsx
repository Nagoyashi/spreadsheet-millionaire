import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthForm from '../components/AuthForm'

export default function LoginPage({ auth }) {
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from || '/app'

  async function handleSubmit(email, password) {
    const result = await auth.login(email, password)
    if (result.success) navigate(from, { replace: true })
    return result
  }

  return (
    <AuthForm
      badge="Welcome back"
      badgeClass="bg-blue-100 text-blue-800"
      title="Sign in"
      subtitle="Enter your credentials to continue."
      submitLabel="Sign in"
      submittingLabel="Signing in…"
      passwordPlaceholder="••••••••"
      onSubmit={handleSubmit}
      belowPassword={
        <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 font-medium transition">
          Forgot password?
        </Link>
      }
      footer={
        <>
          No account?{' '}
          <Link to="/register" state={{ from }} className="text-blue-600 hover:text-blue-700 font-medium transition">
            Register free
          </Link>
        </>
      }
    />
  )
}
