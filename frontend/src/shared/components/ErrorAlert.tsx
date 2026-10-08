export function ErrorAlert({ message }: { message: string }) {
  return (
    <div role="alert" className="alert alert-error">
      {message}
    </div>
  )
}
