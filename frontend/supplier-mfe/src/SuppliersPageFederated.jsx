import { AuthProvider } from '../../shared/authContext.jsx'
import SuppliersPageRaw from './SuppliersPage'

export default function SuppliersPage(props) {
  return (
    <AuthProvider>
      <SuppliersPageRaw {...props} />
    </AuthProvider>
  )
}
