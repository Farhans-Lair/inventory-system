import { AuthProvider } from './authContext'
import StockPageRaw from './StockPage'

/**
 * Module Federation does not share React Context across remote boundaries.
 * The shell's AuthProvider wraps a DIFFERENT AuthContext than this MFE's own
 * authContext.jsx, so StockPageRaw's useAuth() would always see the safe
 * defaults (canWrite: false) when mounted by the shell — even for Admin.
 * This wrapper re-supplies the MFE's own AuthProvider so useAuth() works.
 */
export default function StockPage(props) {
  return (
    <AuthProvider>
      <StockPageRaw {...props} />
    </AuthProvider>
  )
}
