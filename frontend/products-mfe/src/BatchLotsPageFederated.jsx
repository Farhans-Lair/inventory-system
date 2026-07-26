import { AuthProvider } from './authContext'
import BatchLotsPageRaw from './BatchLotsPage'

export default function BatchLotsPage(props) {
  return (
    <AuthProvider>
      <BatchLotsPageRaw {...props} />
    </AuthProvider>
  )
}
