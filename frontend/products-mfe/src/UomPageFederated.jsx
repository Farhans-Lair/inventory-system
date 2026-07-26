import { AuthProvider } from './authContext'
import UomPageRaw from './UomPage'

export default function UomPage(props) {
  return (
    <AuthProvider>
      <UomPageRaw {...props} />
    </AuthProvider>
  )
}
