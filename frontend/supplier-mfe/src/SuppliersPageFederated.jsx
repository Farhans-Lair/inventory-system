import { AuthProvider } from './authContext'
import SuppliersPageRaw from './SuppliersPage'

export default function SuppliersPage(props) {
  return (
    <AuthProvider>
      <SuppliersPageRaw {...props} />
    </AuthProvider>
  )
}
