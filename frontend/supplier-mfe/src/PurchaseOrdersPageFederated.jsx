import { AuthProvider } from '../../shared/authContext.jsx'
import PurchaseOrdersPageRaw from './PurchaseOrdersPage'

export default function PurchaseOrdersPage(props) {
  return (
    <AuthProvider>
      <PurchaseOrdersPageRaw {...props} />
    </AuthProvider>
  )
}
