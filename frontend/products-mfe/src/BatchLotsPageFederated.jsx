import { AuthProvider } from '../../shared/authContext.jsx'
import BatchLotsPageRaw from './BatchLotsPage'

export default function BatchLotsPage(props) {
  return (
    <AuthProvider>
      <BatchLotsPageRaw {...props} />
    </AuthProvider>
  )
}
