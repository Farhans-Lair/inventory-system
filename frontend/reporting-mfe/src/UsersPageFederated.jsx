import { AuthProvider } from './authContext'
import UsersPageRaw from './UsersPage'

export default function UsersPage(props) {
  return (
    <AuthProvider>
      <UsersPageRaw {...props} />
    </AuthProvider>
  )
}
