import { AuthProvider } from './authContext'
import LocationsPageRaw from './LocationsPage'

export default function LocationsPage(props) {
  return (
    <AuthProvider>
      <LocationsPageRaw {...props} />
    </AuthProvider>
  )
}
