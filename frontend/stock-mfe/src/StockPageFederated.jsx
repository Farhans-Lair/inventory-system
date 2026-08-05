import { AuthProvider } from '../../shared/authContext.jsx'
import StockPageRaw from './StockPage'

export default function StockPage(props) {
  return (
    <AuthProvider>
      <StockPageRaw {...props} />
    </AuthProvider>
  )
}
