import { AuthProvider } from './authContext'
import PurchaseOrdersPageRaw from './PurchaseOrdersPage'

export default function PurchaseOrdersPage(props) {
  return (
    <AuthProvider>
      <PurchaseOrdersPageRaw {...props} />
    </AuthProvider>
  )
}
