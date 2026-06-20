import { AuthProvider } from './authContext'
import UsersPageRaw from './UsersPage'

/**
 * Module Federation does not share React Context across remote boundaries.
 * The shell's AuthProvider wraps a DIFFERENT AuthContext than this MFE's own
 * authContext.jsx, so UsersPageRaw's useAuth() would always see the safe
 * defaults (canWrite: false) when mounted by the shell — even for Admin.
 * This wrapper re-supplies the MFE's own AuthProvider so useAuth() works.
 */
export default function UsersPage(props) {
  return (
    <AuthProvider>
      <UsersPageRaw {...props} />
    </AuthProvider>
  )
}
