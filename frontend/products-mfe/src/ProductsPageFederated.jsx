import { AuthProvider } from '../../shared/authContext.jsx'
import ProductsPageRaw from './ProductsPage'

export default function ProductsPage(props) {
  return (
    <AuthProvider>
      <ProductsPageRaw {...props} />
    </AuthProvider>
  )
}
