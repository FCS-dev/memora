import { Link } from 'react-router-dom'
import { LoginForm } from '../components/LoginForm'
import { authCopy } from '../model/copy'

export function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-4">
      <h1 className="text-2xl font-semibold">{authCopy.titles.login}</h1>
      <LoginForm />
      <Link className="link self-start" to="/register">
        {authCopy.links.toRegister}
      </Link>
    </main>
  )
}
