import { Link } from 'react-router-dom'
import { Logo } from '../../../shared/components/Logo'
import { RegisterForm } from '../components/RegisterForm'
import { authCopy } from '../model/copy'

export function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-3">
        <Logo showWordmark={false} size="lg" />
        <h1 className="text-2xl font-bold">{authCopy.titles.register}</h1>
      </div>
      <RegisterForm />
      <Link className="link link-primary self-start text-sm" to="/login">
        {authCopy.links.toLogin}
      </Link>
    </main>
  )
}
