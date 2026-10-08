import { Link } from 'react-router-dom'
import { RegisterForm } from '../components/RegisterForm'
import { authCopy } from '../model/copy'

export function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">{authCopy.titles.register}</h1>
      <RegisterForm />
      <Link className="link self-start" to="/login">
        {authCopy.links.toLogin}
      </Link>
    </main>
  )
}
