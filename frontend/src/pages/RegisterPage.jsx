import { useNavigate, useLocation, Link } from 'react-router-dom'
import AuthForm from '../components/AuthForm'

export default function RegisterPage({ auth }) {
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from || '/app'

  async function handleSubmit(email, password) {
    const result = await auth.register(email, password)
    if (result.success) navigate(from, { replace: true })
    return result
  }

  return (
    <AuthForm
      badge="Welcome"
      badgeClass="bg-emerald-100 text-emerald-800"
      title="Create account"
      subtitle="Save and revisit your calculations any time."
      submitLabel="Create account"
      submittingLabel="Creating account…"
      passwordPlaceholder="At least 8 characters"
      onSubmit={handleSubmit}
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="text-blue-600 hover:text-blue-700 font-medium transition">
            Sign in
          </Link>
        </>
      }
    />
  )
}
