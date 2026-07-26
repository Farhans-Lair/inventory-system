import { AuthProvider } from './authContext'
import ProductsPageRaw from './ProductsPage'

export default function ProductsPage(props) {
  return (
    <AuthProvider>
      <ProductsPageRaw {...props} />
    </AuthProvider>
  )
}
