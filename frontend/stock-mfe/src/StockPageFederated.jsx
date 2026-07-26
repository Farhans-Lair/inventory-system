import { AuthProvider } from './authContext'
import StockPageRaw from './StockPage'

export default function StockPage(props) {
  return (
    <AuthProvider>
      <StockPageRaw {...props} />
    </AuthProvider>
  )
}
