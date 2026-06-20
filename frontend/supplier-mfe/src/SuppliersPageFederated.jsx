import { AuthProvider } from './authContext'
import SuppliersPageRaw from './SuppliersPage'

/**
 * Module Federation does not share React Context across remote boundaries.
 * The shell's AuthProvider wraps a DIFFERENT AuthContext than this MFE's own
 * authContext.jsx, so SuppliersPageRaw's useAuth() would always see the safe
 * defaults (canWrite: false) when mounted by the shell — even for Admin.
 * This wrapper re-supplies the MFE's own AuthProvider so useAuth() works.
 */
export default function SuppliersPage(props) {
  return (
    <AuthProvider>
      <SuppliersPageRaw {...props} />
    </AuthProvider>
  )
}
