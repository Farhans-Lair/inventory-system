import { AuthProvider } from '../../shared/authContext.jsx'
import UomPageRaw from './UomPage'

export default function UomPage(props) {
  return (
    <AuthProvider>
      <UomPageRaw {...props} />
    </AuthProvider>
  )
}
