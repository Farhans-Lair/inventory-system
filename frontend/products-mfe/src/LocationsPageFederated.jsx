import { AuthProvider } from '../../shared/authContext.jsx'
import LocationsPageRaw from './LocationsPage'

export default function LocationsPage(props) {
  return (
    <AuthProvider>
      <LocationsPageRaw {...props} />
    </AuthProvider>
  )
}
