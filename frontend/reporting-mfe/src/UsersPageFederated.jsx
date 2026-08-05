import { AuthProvider } from '../../shared/authContext.jsx'
import UsersPageRaw from './UsersPage'

export default function UsersPage(props) {
  return (
    <AuthProvider>
      <UsersPageRaw {...props} />
    </AuthProvider>
  )
}
